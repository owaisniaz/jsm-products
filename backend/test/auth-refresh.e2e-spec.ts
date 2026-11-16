import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import mongoose, { type Connection, type Model } from 'mongoose';
import { AuthSessionService } from '../src/auth/auth-session.service.js';
import { TokenService } from '../src/auth/token.service.js';
import type { AuthSession } from '../src/auth/types.js';
import { UserRepository } from '../src/user/user.repository.js';
import {
  User,
  UserSchema,
  type RefreshSessionData,
} from '../src/user/user.schema.js';

describe('Refresh-session MongoDB concurrency (e2e)', () => {
  let connection: Connection;
  let userModel: Model<User>;
  let repository: UserRepository;
  let tokenService: TokenService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const uri = process.env.MONGODB_TEST_URI;
    if (!uri) {
      throw new Error(
        'MONGODB_TEST_URI is required for refresh-session e2e tests',
      );
    }

    connection = await mongoose.createConnection(uri).asPromise();
    userModel = connection.model<User>(User.name, UserSchema);
    repository = new UserRepository(userModel);
    tokenService = new TokenService(
      new JwtService(),
      new ConfigService({
        JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough',
        JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough',
        JWT_ACCESS_TTL_SECONDS: 900,
        JWT_REFRESH_TTL_SECONDS: 3600,
      }),
    );
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await userModel.deleteMany({ _id: { $in: createdUserIds } }).exec();
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    await connection?.close();
  });

  it('rotates one valid refresh session', async () => {
    const user = await createUser([session('old-jti', 'old-hash')]);
    const next = session('new-jti', 'new-hash');

    await expect(
      repository.rotateRefreshSession(
        user.id,
        { jti: 'old-jti', tokenHash: 'old-hash' },
        next,
      ),
    ).resolves.toBe(true);

    const saved = await readSessions(user.id);
    expect(saved).toEqual([expect.objectContaining(next)]);
  });

  it('allows only one concurrent rotation and preserves the winner', async () => {
    const user = await createUser();
    const oldTokens = await tokenService.generatePair({ id: user.id });
    await repository.addRefreshSession(user.id, {
      ...session(
        oldTokens.refreshJti,
        await tokenService.hash(oldTokens.refreshToken),
        'Device one',
      ),
      expiresAt: oldTokens.refreshExpiresAt,
    });
    await repository.addRefreshSession(
      user.id,
      session('other-jti', 'other-hash', 'Device two'),
    );
    const authSessionService = new AuthSessionService(repository, tokenService);
    const results = await Promise.allSettled([
      authSessionService.refresh(oldTokens.refreshToken),
      authSessionService.refresh(oldTokens.refreshToken),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const winner = results.find(
      (result): result is PromiseFulfilledResult<AuthSession> =>
        result.status === 'fulfilled',
    );
    if (!winner) throw new Error('No refresh request won the rotation');

    let saved = await readSessions(user.id);
    const winningSession = saved.find(
      (item) => item.jti === winner.value.tokens.refreshJti,
    );
    if (!winningSession)
      throw new Error('Winning refresh session was not saved');
    await expect(
      tokenService.compare(
        winner.value.tokens.refreshToken,
        winningSession.tokenHash,
      ),
    ).resolves.toBe(true);
    expect(saved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jti: 'other-jti',
          tokenHash: 'other-hash',
          revokedAt: null,
        }),
      ]),
    );

    const nextTokens = await authSessionService.refresh(
      winner.value.tokens.refreshToken,
    );
    saved = await readSessions(user.id);
    const nextSession = saved.find(
      (item) => item.jti === nextTokens.tokens.refreshJti,
    );
    if (!nextSession) throw new Error('Next refresh session was not saved');
    await expect(
      tokenService.compare(
        nextTokens.tokens.refreshToken,
        nextSession.tokenHash,
      ),
    ).resolves.toBe(true);
    await expect(
      authSessionService.refresh(oldTokens.refreshToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs out one device without affecting others, then logs out all devices', async () => {
    const user = await createUser([
      session('device-one-jti', 'device-one-hash', 'Device one'),
      session('device-two-jti', 'device-two-hash', 'Device two'),
    ]);

    await expect(
      repository.revokeRefreshSession(user.id, {
        jti: 'device-one-jti',
        tokenHash: 'device-one-hash',
      }),
    ).resolves.toBe(true);

    let saved = await readSessions(user.id);
    expect(saved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jti: 'device-one-jti',
          revokedAt: expect.any(Date),
        }),
        expect.objectContaining({ jti: 'device-two-jti', revokedAt: null }),
      ]),
    );

    await repository.revokeAllRefreshSessions(user.id);

    saved = await readSessions(user.id);
    expect(saved.every((item) => item.revokedAt instanceof Date)).toBe(true);
  });

  async function createUser(sessions: RefreshSessionData[] = []) {
    const [user] = await userModel.insertMany([
      {
        username: 'Refresh audit',
        email: `refresh-${randomUUID()}@example.test`,
        password: 'test-password-hash',
        refreshSessions: sessions,
      },
    ]);
    if (!user) throw new Error('Test user could not be created');
    createdUserIds.push(user.id);
    return user;
  }

  async function readSessions(userId: string) {
    const user = await userModel
      .findById(userId)
      .select('+refreshSessions')
      .exec();
    if (!user) throw new Error('Test user was not found');
    return user.refreshSessions;
  }

  function session(
    jti: string,
    tokenHash: string,
    userAgent = 'Test device',
  ): RefreshSessionData {
    return {
      jti,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      userAgent,
      ip: '192.0.2.1',
      lastUsedAt: new Date(),
      revokedAt: null,
    };
  }
});
