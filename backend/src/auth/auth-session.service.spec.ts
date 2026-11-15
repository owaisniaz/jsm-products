import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { UserRepository } from '../user/user.repository.js';
import type { UserDocument } from '../user/user.schema.js';
import { AuthSessionService } from './auth-session.service.js';
import type { TokenService } from './token.service.js';

describe('AuthSessionService', () => {
  const userRepository = {
    addRefreshSession: vi.fn(),
    findByIdWithRefreshSessions: vi.fn(),
    rotateRefreshSession: vi.fn(),
    revokeRefreshSession: vi.fn(),
    revokeRefreshSessionByJti: vi.fn(),
    revokeAllRefreshSessions: vi.fn(),
  };
  const tokenService = {
    generatePair: vi.fn(),
    hash: vi.fn(),
    compare: vi.fn(),
    verifyRefresh: vi.fn(),
  };
  const tokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    refreshJti: 'refresh-jti',
    refreshExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
  };
  const previousSession = {
    jti: 'previous-jti',
    tokenHash: 'stored-old-hash',
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    userAgent: 'Browser',
    ip: '192.0.2.1',
    lastUsedAt: new Date('2029-01-01T00:00:00.000Z'),
    revokedAt: null,
  };
  const makeUser = (
    refreshSessions = [previousSession],
  ): UserDocument =>
    ({
      id: 'user-id',
      username: 'Taylor',
      email: 'taylor@example.com',
      isActive: true,
      roles: [],
      refreshSessions,
    }) as unknown as UserDocument;
  const user = makeUser();
  let service: AuthSessionService;

  beforeEach(() => {
    userRepository.addRefreshSession.mockReset().mockResolvedValue(true);
    userRepository.findByIdWithRefreshSessions
      .mockReset()
      .mockResolvedValue(user);
    userRepository.rotateRefreshSession.mockReset().mockResolvedValue(true);
    userRepository.revokeRefreshSession.mockReset().mockResolvedValue(true);
    userRepository.revokeRefreshSessionByJti
      .mockReset()
      .mockResolvedValue(true);
    userRepository.revokeAllRefreshSessions.mockReset().mockResolvedValue(undefined);
    tokenService.generatePair.mockReset().mockResolvedValue(tokens);
    tokenService.hash.mockReset().mockResolvedValue('hash:new-refresh-token');
    tokenService.compare.mockReset().mockResolvedValue(true);
    tokenService.verifyRefresh.mockReset().mockResolvedValue({
      sub: 'user-id',
      type: 'refresh',
      jti: 'previous-jti',
    });

    service = new AuthSessionService(
      userRepository as unknown as UserRepository,
      tokenService as unknown as TokenService,
    );
  });

  it('creates a hashed session with login device metadata', async () => {
    const result = await service.create(user, {
      userAgent: 'Browser',
      ip: '192.0.2.1',
    });

    expect(tokenService.generatePair).toHaveBeenCalledWith({ id: 'user-id' });
    expect(userRepository.addRefreshSession).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({
        jti: tokens.refreshJti,
        tokenHash: 'hash:new-refresh-token',
        expiresAt: tokens.refreshExpiresAt,
        userAgent: 'Browser',
        ip: '192.0.2.1',
        revokedAt: null,
        lastUsedAt: expect.any(Date),
      }),
    );
    expect(result.tokens.refreshToken).toBe('refresh-token');
    expect(JSON.stringify(result)).not.toContain('hash:new-refresh-token');
  });

  it('creates independent refresh sessions for separate devices', async () => {
    const secondTokens = {
      ...tokens,
      refreshToken: 'second-refresh-token',
      refreshJti: 'second-jti',
    };
    tokenService.generatePair
      .mockResolvedValueOnce(tokens)
      .mockResolvedValueOnce(secondTokens);

    await service.create(user, { userAgent: 'Device one', ip: '192.0.2.1' });
    await service.create(user, { userAgent: 'Device two', ip: '192.0.2.2' });

    expect(userRepository.addRefreshSession).toHaveBeenNthCalledWith(
      1,
      'user-id',
      expect.objectContaining({ jti: 'refresh-jti', userAgent: 'Device one' }),
    );
    expect(userRepository.addRefreshSession).toHaveBeenNthCalledWith(
      2,
      'user-id',
      expect.objectContaining({ jti: 'second-jti', userAgent: 'Device two' }),
    );
  });

  it('fails explicitly when the session cannot be stored', async () => {
    userRepository.addRefreshSession.mockResolvedValue(false);

    await expect(service.create(user)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('rotates a valid refresh token through a compare-and-swap update', async () => {
    const result = await service.refresh('old-refresh-token');

    expect(tokenService.compare).toHaveBeenCalledWith(
      'old-refresh-token',
      'stored-old-hash',
    );
    expect(userRepository.rotateRefreshSession).toHaveBeenCalledWith(
      'user-id',
      { jti: 'previous-jti', tokenHash: 'stored-old-hash' },
      expect.objectContaining({
        jti: tokens.refreshJti,
        tokenHash: 'hash:new-refresh-token',
        expiresAt: tokens.refreshExpiresAt,
        userAgent: 'Browser',
        ip: '192.0.2.1',
        lastUsedAt: expect.any(Date),
        revokedAt: null,
      }),
    );
    expect(result.user.id).toBe('user-id');
  });

  it('rejects invalid tokens, expired sessions, and revoked sessions', async () => {
    tokenService.verifyRefresh.mockRejectedValueOnce(
      new UnauthorizedException('Invalid token'),
    );
    await expect(service.refresh('invalid')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    userRepository.findByIdWithRefreshSessions.mockResolvedValueOnce(
      makeUser([{ ...previousSession, expiresAt: new Date(Date.now() - 1) }]),
    );
    await expect(service.refresh('expired')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    userRepository.findByIdWithRefreshSessions.mockResolvedValueOnce(
      makeUser([{ ...previousSession, revokedAt: new Date() }]),
    );
    await expect(service.refresh('revoked')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects refresh-token reuse after another rotation', async () => {
    userRepository.findByIdWithRefreshSessions.mockResolvedValueOnce(makeUser([]));

    await expect(service.refresh('old-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(userRepository.rotateRefreshSession).not.toHaveBeenCalled();
  });

  it('rejects a compare-and-swap failure after a competing refresh', async () => {
    userRepository.rotateRefreshSession.mockResolvedValue(false);

    await expect(
      service.refresh('old-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows only one of two concurrent refreshes to rotate a session', async () => {
    let updated = false;
    userRepository.rotateRefreshSession.mockImplementation(async () => {
      if (updated) return false;
      updated = true;
      return true;
    });

    const results = await Promise.allSettled([
      service.refresh('old-refresh-token'),
      service.refresh('old-refresh-token'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(userRepository.rotateRefreshSession).toHaveBeenCalledTimes(2);
  });

  it('revokes only the matching verified refresh session', async () => {
    await service.logout('refresh-token');

    expect(userRepository.revokeRefreshSession).toHaveBeenCalledWith(
      'user-id',
      { jti: 'previous-jti', tokenHash: 'stored-old-hash' },
    );
  });

  it('treats expired or invalid logout tokens as already ended', async () => {
    tokenService.verifyRefresh.mockRejectedValue(
      new UnauthorizedException('Invalid or expired token'),
    );

    await expect(service.logout('expired-token')).resolves.toBeUndefined();
    expect(userRepository.revokeRefreshSession).not.toHaveBeenCalled();
  });

  it('revokes every session for logout-all', async () => {
    await service.logoutAll('user-id');
    expect(userRepository.revokeAllRefreshSessions).toHaveBeenCalledWith(
      'user-id',
    );
  });

  it('lists only safe active session fields and marks the current device', async () => {
    const activeSession = {
      ...previousSession,
      tokenHash: 'must-not-be-returned',
    };
    userRepository.findByIdWithRefreshSessions.mockResolvedValue(
      makeUser([
        activeSession,
        { ...previousSession, jti: 'expired', expiresAt: new Date(0) },
        { ...previousSession, jti: 'revoked', revokedAt: new Date() },
      ]),
    );

    const sessions = await service.listActiveSessions(
      'user-id',
      'current-refresh-token',
    );

    expect(sessions).toEqual([
      {
        jti: 'previous-jti',
        userAgent: 'Browser',
        ip: '192.0.2.1',
        lastUsedAt: previousSession.lastUsedAt,
        expiresAt: previousSession.expiresAt,
        isCurrent: true,
      },
    ]);
    expect(JSON.stringify(sessions)).not.toContain('tokenHash');
    expect(JSON.stringify(sessions)).not.toContain('must-not-be-returned');
  });

  it('reports a missing session when revoking by jti', async () => {
    userRepository.revokeRefreshSessionByJti.mockResolvedValue(false);
    await expect(
      service.revokeSession('user-id', 'unknown-jti'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
