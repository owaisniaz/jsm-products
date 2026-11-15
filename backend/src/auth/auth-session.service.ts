import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from '../user/user.repository.js';
import type { RefreshSessionData, UserDocument } from '../user/user.schema.js';
import { TokenService } from './token.service.js';
import type {
  ActiveSession,
  AuthSession,
  SessionMetadata,
  SignupResponse,
} from './types.js';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async create(
    user: UserDocument,
    metadata: SessionMetadata = {},
  ): Promise<AuthSession> {
    const tokens = await this.tokenService.generatePair({ id: user.id });
    const saved = await this.userRepository.addRefreshSession(
      user.id,
      await this.toRefreshSession(tokens, metadata),
    );
    if (!saved) {
      throw new InternalServerErrorException();
    }

    return { user: this.toResponse(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const payload = await this.tokenService.verifyRefresh(refreshToken);
    if (!payload.jti) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findByIdWithRefreshSessions(
      payload.sub,
    );
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const previous = user.refreshSessions.find(
      (session) => session.jti === payload.jti,
    );
    if (
      !previous ||
      previous.revokedAt != null ||
      previous.expiresAt.getTime() <= Date.now() ||
      !(await this.tokenService.compare(refreshToken, previous.tokenHash))
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.tokenService.generatePair({ id: user.id });
    const rotated = await this.userRepository.rotateRefreshSession(
      user.id,
      {
        jti: previous.jti,
        tokenHash: previous.tokenHash,
      },
      await this.toRefreshSession(tokens, {
        ...(previous.userAgent === null
          ? {}
          : { userAgent: previous.userAgent }),
        ...(previous.ip === null ? {} : { ip: previous.ip }),
      }),
    );
    if (!rotated) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return { user: this.toResponse(user), tokens };
  }

  async logout(refreshToken: string): Promise<void> {
    let payload;
    try {
      payload = await this.tokenService.verifyRefresh(refreshToken);
    } catch (error) {
      if (error instanceof UnauthorizedException) return;
      throw error;
    }

    if (!payload.jti || !payload.sub) return;

    const user = await this.userRepository.findByIdWithRefreshSessions(
      payload.sub,
    );
    const session = user?.refreshSessions.find(
      (candidate) => candidate.jti === payload.jti,
    );
    if (
      !session ||
      session.revokedAt != null ||
      session.expiresAt.getTime() <= Date.now() ||
      !(await this.tokenService.compare(refreshToken, session.tokenHash))
    ) {
      return;
    }

    await this.userRepository.revokeRefreshSession(payload.sub, {
      jti: session.jti,
      tokenHash: session.tokenHash,
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.userRepository.revokeAllRefreshSessions(userId);
  }

  async listActiveSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<ActiveSession[]> {
    const user = await this.userRepository.findByIdWithRefreshSessions(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid access token');
    }

    let currentJti: string | undefined;
    if (currentRefreshToken) {
      try {
        const payload =
          await this.tokenService.verifyRefresh(currentRefreshToken);
        if (payload.sub === userId) currentJti = payload.jti;
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) throw error;
      }
    }

    const now = Date.now();
    return user.refreshSessions
      .filter(
        (session) =>
          session.revokedAt == null && session.expiresAt.getTime() > now,
      )
      .map((session) => ({
        jti: session.jti,
        userAgent: session.userAgent ?? null,
        ip: session.ip ?? null,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        isCurrent: session.jti === currentJti,
      }));
  }

  async revokeSession(userId: string, jti: string): Promise<void> {
    const revoked = await this.userRepository.revokeRefreshSessionByJti(
      userId,
      jti,
    );
    if (!revoked) {
      throw new NotFoundException('Session not found');
    }
  }

  private async toRefreshSession(
    tokens: AuthSession['tokens'],
    metadata: SessionMetadata,
  ): Promise<RefreshSessionData> {
    return {
      jti: tokens.refreshJti,
      tokenHash: await this.tokenService.hash(tokens.refreshToken),
      expiresAt: tokens.refreshExpiresAt,
      userAgent: metadata.userAgent,
      ip: metadata.ip,
      lastUsedAt: new Date(),
      revokedAt: null,
    };
  }

  private toResponse(user: UserDocument): SignupResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      ...(user.photo === undefined ? {} : { photo: user.photo }),
      roles: user.roles?.map((role) => role.toString()) ?? [],
    };
  }
}
