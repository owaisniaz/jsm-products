import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CookieService } from './cookie.service.js';

describe('CookieService', () => {
  const configValues: Record<string, string | number> = {
    NODE_ENV: 'development',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 604800,
  };
  const configService = {
    getOrThrow: vi.fn((key: string) => configValues[key]),
  };
  let service: CookieService;

  beforeEach(() => {
    configValues.NODE_ENV = 'development';
    configService.getOrThrow.mockClear();
    service = new CookieService(configService as unknown as ConfigService);
  });

  it('sets HttpOnly access and refresh cookies with their intended paths', () => {
    const setCookie = vi.fn();
    const response = { cookie: setCookie } as unknown as Response;

    service.set(response, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshJti: 'refresh-jti',
      refreshExpiresAt: new Date(),
    });

    expect(setCookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        maxAge: 900000,
      }),
    );
    expect(setCookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/v1/auth',
        maxAge: 604800000,
      }),
    );
  });

  it('marks cookies secure in production', () => {
    configValues.NODE_ENV = 'production';
    service = new CookieService(configService as unknown as ConfigService);
    const setCookie = vi.fn();
    const response = { cookie: setCookie } as unknown as Response;

    service.set(response, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshJti: 'refresh-jti',
      refreshExpiresAt: new Date(),
    });

    expect(setCookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      'access-token',
      expect.objectContaining({ secure: true }),
    );
  });

  it('reads access and refresh cookies from the request header', () => {
    const request = {
      headers: {
        cookie:
          'other=value; access_token=access.jwt.value; refresh_token=refresh.jwt.value',
      },
    } as Request;

    expect(service.getAccess(request)).toBe('access.jwt.value');
    expect(service.getRefresh(request)).toBe('refresh.jwt.value');
  });

  it('returns undefined when a cookie is absent', () => {
    const request = { headers: {} } as Request;

    expect(service.getRefresh(request)).toBeUndefined();
    expect(service.getAccess(request)).toBeUndefined();
  });
});
