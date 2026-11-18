import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../common/errors/app-error.js';
import type { JwtPayload } from './auth.constants.js';

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) { }

  async generatePair(user: {
    id: string;
    role?: string;
    activeCompanyId?: string;
    accountType?: 'OWNER' | 'STAFF';
  }) {
    const jti = randomUUID();
    const refreshTtl = Number(this.config.getOrThrow<number>(
      'JWT_REFRESH_TTL_SECONDS',
    ));
    const accessPayload: JwtPayload = {
      sub: user.id,
      type: 'access',
      ...(user.role && { role: user.role }),
      ...(user.activeCompanyId && { activeCompanyId: user.activeCompanyId }),
      ...(user.accountType && { accountType: user.accountType }),
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
      }),
      this.jwt.signAsync(
        {
          sub: user.id,
          type: 'refresh',
          jti,
          ...(user.activeCompanyId && { activeCompanyId: user.activeCompanyId }),
          ...(user.accountType && { accountType: user.accountType }),
        } satisfies JwtPayload,
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshTtl,
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      refreshJti: jti,
      refreshExpiresAt: new Date(Date.now() + refreshTtl * 1000),
    };
  }

  verifyAccess(token: string) {
    return this.verify(token, 'JWT_ACCESS_SECRET', 'access');
  }

  verifyRefresh(token: string) {
    return this.verify(token, 'JWT_REFRESH_SECRET', 'refresh');
  }

  hash(token: string): Promise<string> {
    return bcrypt.hash(token, 12);
  }

  compare(token: string, tokenHash: string): Promise<boolean> {
    return bcrypt.compare(token, tokenHash);
  }

  signInvite(payload: {
    userId: string;
    companyId: string;
    companyCode: string;
  }): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, type: 'invite' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: 60 * 60 * 24 * 7,
      },
    );
  }

  async verifyInvite(token: string): Promise<{
    userId: string;
    companyId: string;
    companyCode: string;
  }> {
    const payload = await this.jwt.verifyAsync<{
      userId: string;
      companyId: string;
      companyCode: string;
      type: 'invite';
    }>(token, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') });
    if (payload.type !== 'invite') throw new UnauthorizedException('Invalid invite token');
    return {
      userId: payload.userId,
      companyId: payload.companyId,
      companyCode: payload.companyCode,
    };
  }
private async verify(token: string, secretKey: string, expected: JwtPayload['type']) {
  // JWT errors are translated to TOKEN_EXPIRED / TOKEN_INVALID by the global filter
  const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
    secret: this.config.getOrThrow<string>(secretKey),
  });

  if (payload.type !== expected) {
    throw new AppError('TOKEN_WRONG_TYPE');
  }

  return payload;
}
}