import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './auth.constants.js';
import type { AuthSession } from './types.js';

@Injectable()
export class CookieService {
  private readonly base: CookieOptions;

  constructor(private readonly config: ConfigService) {
    this.base = {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
    };
  }

  set(res: Response, tokens: AuthSession['tokens']) {
    const accessTtl =
      this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS') * 1000;
    const refreshTtl =
      this.config.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS') * 1000;
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.base,
      path: '/',
      maxAge: accessTtl,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.base,
      path: '/api/v1/auth',
      maxAge: refreshTtl,
    });
  }

  clear(res: Response) {
    // path must match the one used when setting, or the browser keeps the cookie
    res.clearCookie(ACCESS_COOKIE, { ...this.base, path: '/' });
    res.clearCookie(REFRESH_COOKIE, {
      ...this.base,
      path: '/api/v1/auth',
    });
  }

  getRefresh(req: Request): string | undefined {
    return this.get(req, REFRESH_COOKIE);
  }

  getAccess(req: Request): string | undefined {
    return this.get(req, ACCESS_COOKIE);
  }

  private get(req: Request, name: string): string | undefined {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;

    for (const cookie of cookieHeader.split(';')) {
      const separator = cookie.indexOf('=');
      if (
        separator !== -1 &&
        cookie.slice(0, separator).trim() === name
      ) {
        return cookie.slice(separator + 1).trim();
      }
    }

    return undefined;
  }
}