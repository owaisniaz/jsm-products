import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CookieService } from './cookie.service.js';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from './access-token.guard.js';
import { TokenService } from './token.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    signup: vi.fn(),
    signin: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    sessions: vi.fn(),
    revokeSession: vi.fn(),
  };
  const cookieService = {
    set: vi.fn(),
    getRefresh: vi.fn(),
    getAccess: vi.fn(),
    clear: vi.fn(),
  };
  const response = {} as Response;
  const session = {
    user: {
      id: 'user-id',
      username: 'Taylor',
      email: 'taylor@example.com',
      roles: [],
    },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshJti: 'refresh-jti',
      refreshExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
    },
  };

  beforeEach(async () => {
    authService.signup.mockReset();
    authService.signin.mockReset();
    authService.refresh.mockReset();
    authService.logout.mockReset();
    authService.logoutAll.mockReset();
    authService.sessions.mockReset();
    authService.revokeSession.mockReset();
    cookieService.set.mockReset();
    cookieService.getRefresh.mockReset();
    cookieService.getAccess.mockReset();
    cookieService.clear.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: CookieService, useValue: cookieService },
        { provide: TokenService, useValue: {} },
        { provide: AccessTokenGuard, useValue: { canActivate: vi.fn() } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('sets session cookies on signup and returns only the profile', async () => {
    const signupData = {
      username: 'Taylor',
      email: 'taylor@example.com',
      password: 'Pass1234!',
      passwordConfirm: 'Pass1234!',
    };
    const request = {
      get: vi.fn().mockReturnValue('Browser'),
      ip: '192.0.2.1',
    } as unknown as Request;
    authService.signup.mockResolvedValue(session);

    await expect(
      controller.signup(signupData, request, response),
    ).resolves.toEqual(session.user);
    expect(authService.signup).toHaveBeenCalledWith(signupData, {
      userAgent: 'Browser',
      ip: '192.0.2.1',
    });
    expect(cookieService.set).toHaveBeenCalledWith(response, session.tokens);
  });

  it('sets session cookies on signin and returns only the profile', async () => {
    const signinData = {
      email: 'taylor@example.com',
      password: 'Pass1234!',
    };
    const request = {
      get: vi.fn().mockReturnValue('Browser'),
      ip: '192.0.2.1',
    } as unknown as Request;
    authService.signin.mockResolvedValue(session);

    await expect(
      controller.signin(signinData, request, response),
    ).resolves.toEqual(session.user);
    expect(authService.signin).toHaveBeenCalledWith(signinData, {
      userAgent: 'Browser',
      ip: '192.0.2.1',
    });
    expect(cookieService.set).toHaveBeenCalledWith(response, session.tokens);
  });

  it('rotates cookies when refreshing the session', async () => {
    const request = {} as Request;
    cookieService.getRefresh.mockReturnValue('refresh-token');
    authService.refresh.mockResolvedValue(session);

    await expect(controller.refresh(request, response)).resolves.toEqual(
      session.user,
    );
    expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
    expect(cookieService.set).toHaveBeenCalledWith(response, session.tokens);
  });

  it('revokes the refresh session and clears cookies on logout', async () => {
    const request = {} as Request;
    cookieService.getRefresh.mockReturnValue('refresh-token');

    await expect(controller.logout(request, response)).resolves.toBeUndefined();

    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(cookieService.clear).toHaveBeenCalledWith(response);
  });

  it('clears cookies when no refresh token is present', async () => {
    const request = {} as Request;
    cookieService.getRefresh.mockReturnValue(undefined);

    await expect(controller.logout(request, response)).resolves.toBeUndefined();

    expect(authService.logout).not.toHaveBeenCalled();
    expect(cookieService.clear).toHaveBeenCalledWith(response);
  });

  it('clears cookies even if session revocation fails', async () => {
    const request = {} as Request;
    cookieService.getRefresh.mockReturnValue('refresh-token');
    authService.logout.mockRejectedValue(new Error('database unavailable'));

    await expect(controller.logout(request, response)).rejects.toThrow(
      'database unavailable',
    );

    expect(cookieService.clear).toHaveBeenCalledWith(response);
  });

  it('uses the authenticated user for logout-all and clears the cookies', async () => {
    const request = { user: { sub: 'authenticated-user' } } as AuthenticatedRequest;

    await controller.logoutAll(request, response);

    expect(authService.logoutAll).toHaveBeenCalledWith('authenticated-user');
    expect(cookieService.clear).toHaveBeenCalledWith(response);
  });

  it('lists sessions for the authenticated user with the current refresh token', async () => {
    const request = { user: { sub: 'authenticated-user' } } as AuthenticatedRequest;
    cookieService.getRefresh.mockReturnValue('current-refresh-token');
    authService.sessions.mockResolvedValue([]);

    await controller.sessions(request);

    expect(authService.sessions).toHaveBeenCalledWith(
      'authenticated-user',
      'current-refresh-token',
    );
  });

  it('only revokes a session under the authenticated user id', async () => {
    const request = { user: { sub: 'authenticated-user' } } as AuthenticatedRequest;
    await controller.revokeSession(request, '123e4567-e89b-42d3-a456-426614174000');

    expect(authService.revokeSession).toHaveBeenCalledWith(
      'authenticated-user',
      '123e4567-e89b-42d3-a456-426614174000',
    );
  });
});
