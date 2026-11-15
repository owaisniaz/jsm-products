import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { UserRepository } from '../user/user.repository.js';
import { AuthSessionService } from './auth-session.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const userRepository = { create: vi.fn(), findByEmail: vi.fn() };
  const authSessionService = {
    create: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    listActiveSessions: vi.fn(),
    revokeSession: vi.fn(),
  };

  beforeEach(async () => {
    userRepository.create.mockReset();
    userRepository.findByEmail.mockReset().mockResolvedValue(null);
    authSessionService.create.mockReset();
    authSessionService.refresh.mockReset();
    authSessionService.logout.mockReset();
    authSessionService.logoutAll.mockReset();
    authSessionService.listActiveSessions.mockReset();
    authSessionService.revokeSession.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        { provide: AuthSessionService, useValue: authSessionService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a user and returns safe user data', async () => {
    const user = {
      id: 'user-id',
      username: 'Taylor',
      email: 'taylor@example.com',
      photo: undefined,
      roles: [],
    };
    const session = { user, tokens: {} };
    userRepository.create.mockResolvedValue({
      ...user,
    });
    authSessionService.create.mockResolvedValue(session);

    const result = await service.signup({
      username: ' Taylor ',
      email: ' TAYLOR@EXAMPLE.COM ',
      password: 'Pass1234!',
      passwordConfirm: 'Pass1234!',
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      'taylor@example.com',
      true,
    );
    expect(userRepository.create).toHaveBeenCalledOnce();
    const [createdUser] = userRepository.create.mock.calls[0]!;
    expect(createdUser).toMatchObject({
      username: 'Taylor',
      email: 'taylor@example.com',
      password: 'Pass1234!',
    });
    expect(authSessionService.create).toHaveBeenCalledWith(user, {});
    expect(result).toBe(session);
  });

  it('signs in with a valid password and returns safe user data', async () => {
    const passwordHash = await bcrypt.hash('Pass1234!', 4);
    const user = {
      id: 'user-id',
      username: 'Taylor',
      email: 'taylor@example.com',
      password: passwordHash,
      isActive: true,
      roles: [],
    };
    const session = { user, tokens: {} };
    userRepository.findByEmail.mockResolvedValue(user);
    authSessionService.create.mockResolvedValue(session);

    const result = await service.signin({
      email: ' TAYLOR@EXAMPLE.COM ',
      password: 'Pass1234!',
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      'taylor@example.com',
    );
    expect(authSessionService.create).toHaveBeenCalledWith(user, {});
    expect(result).toBe(session);
  });

  it('rejects unknown emails and incorrect passwords with the same error', async () => {
    await expect(
      service.signin({
        email: 'missing@example.com',
        password: 'Pass1234!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    userRepository.findByEmail.mockResolvedValue({
      id: 'user-id',
      username: 'Taylor',
      email: 'taylor@example.com',
      password: await bcrypt.hash('CorrectPassword', 4),
      isActive: true,
      roles: [],
    });

    await expect(
      service.signin({
        email: 'taylor@example.com',
        password: 'WrongPassword',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive accounts', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-id',
      username: 'Taylor',
      email: 'taylor@example.com',
      password: await bcrypt.hash('Pass1234!', 4),
      isActive: false,
      roles: [],
    });

    await expect(
      service.signin({
        email: 'taylor@example.com',
        password: 'Pass1234!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an email that already belongs to a user', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.signup({
        username: 'Taylor',
        email: 'taylor@example.com',
        password: 'Pass1234!',
        passwordConfirm: 'Pass1234!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('converts a duplicate-key race into a conflict response', async () => {
    userRepository.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.signup({
        username: 'Taylor',
        email: 'taylor@example.com',
        password: 'Pass1234!',
        passwordConfirm: 'Pass1234!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('delegates refresh-token handling to the auth session service', async () => {
    const session = { user: {}, tokens: {} };
    authSessionService.refresh.mockResolvedValue(session);

    await expect(service.refresh('refresh-token')).resolves.toBe(session);
    expect(authSessionService.refresh).toHaveBeenCalledWith('refresh-token');
  });

  it('delegates logout to the auth session service', async () => {
    authSessionService.logout.mockResolvedValue(undefined);

    await expect(service.logout('refresh-token')).resolves.toBeUndefined();
    expect(authSessionService.logout).toHaveBeenCalledWith('refresh-token');
  });
});
