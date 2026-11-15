import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { JwtPayload } from './auth.constants.js';

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) { }

  async generatePair(user: { id: string; role?: string }) {
    const jti = randomUUID();
    const refreshTtl = this.config.getOrThrow<number>(
      'JWT_REFRESH_TTL_SECONDS',
    );
    const accessPayload: JwtPayload = {
      sub: user.id,
      type: 'access',
      ...(user.role && { role: user.role }),
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
      }),
      this.jwt.signAsync(
        { sub: user.id, type: 'refresh', jti } satisfies JwtPayload,
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

  private async verify(token: string, secretKey: string, expected: JwtPayload['type']) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>(secretKey),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')
      ) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw error;
    }

    if (payload.type !== expected) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return payload;
  }
}