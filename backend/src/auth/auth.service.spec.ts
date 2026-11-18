import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { UserRepository } from '../user/user.repository.js';
import { AuthSessionService } from './auth-session.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const userRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByEmailWithPasswordResetOtp: vi.fn(),
    setPasswordResetOtp: vi.fn(),
    incrementOtpAttempts: vi.fn(),
    clearPasswordResetOtp: vi.fn(),
    updatePasswordAndClearOtp: vi.fn(),
  };
  const eventEmitter = { emit: vi.fn() };
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
    userRepository.findById.mockReset();
    userRepository.findByEmail.mockReset().mockResolvedValue(null);
    userRepository.findByEmailWithPasswordResetOtp.mockReset();
    userRepository.setPasswordResetOtp.mockReset();
    userRepository.incrementOtpAttempts.mockReset();
    userRepository.clearPasswordResetOtp.mockReset();
    userRepository.updatePasswordAndClearOtp.mockReset();
    eventEmitter.emit.mockReset();
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
        { provide: EventEmitter2, useValue: eventEmitter },
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

  it('stores only a hashed OTP and emits the email event for active users', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-id',
      status: 'ACTIVE',
      isActive: true,
    });
    userRepository.setPasswordResetOtp.mockResolvedValue(true);

    await expect(
      service.forgotPassword({ email: ' Taylor@Example.com ' }),
    ).resolves.toEqual({
      message:
        'If an account exists with this email, a 6-digit verification code has been sent.',
    });

    const [eventName, event] = eventEmitter.emit.mock.calls[0]!;
    expect(eventName).toBe('auth.password_reset_otp_requested');
    expect(event).toMatchObject({
      email: 'taylor@example.com',
      expiresInMinutes: 10,
    });
    expect(event.rawOtp).toMatch(/^\d{6}$/);
    expect(userRepository.setPasswordResetOtp).toHaveBeenCalledWith(
      'user-id',
      createHash('sha256').update(event.rawOtp).digest('hex'),
      expect.any(Date),
    );
  });

  it('returns the same forgot-password response for unknown users', async () => {
    await expect(
      service.forgotPassword({ email: 'missing@example.com' }),
    ).resolves.toEqual({
      message:
        'If an account exists with this email, a 6-digit verification code has been sent.',
    });
    expect(userRepository.setPasswordResetOtp).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('increments attempts and rejects incorrect reset codes', async () => {
    userRepository.findByEmailWithPasswordResetOtp.mockResolvedValue({
      id: 'user-id',
      status: 'ACTIVE',
      isActive: true,
      passwordResetOtpHash: createHash('sha256').update('123456').digest('hex'),
      passwordResetOtpExpiresAt: new Date(Date.now() + 60_000),
      passwordResetOtpAttempts: 0,
    });
    userRepository.incrementOtpAttempts.mockResolvedValue(1);

    await expect(
      service.verifyResetOtp({ email: 'taylor@example.com', otp: '654321' }),
    ).rejects.toThrow('Invalid verification code');
    expect(userRepository.incrementOtpAttempts).toHaveBeenCalledWith('user-id');
  });

  it('resets the password and revokes existing sessions after a valid OTP', async () => {
    const otpHash = createHash('sha256').update('123456').digest('hex');
    userRepository.findByEmailWithPasswordResetOtp.mockResolvedValue({
      id: 'user-id',
      status: 'ACTIVE',
      isActive: true,
      passwordResetOtpHash: otpHash,
      passwordResetOtpExpiresAt: new Date(Date.now() + 60_000),
      passwordResetOtpAttempts: 0,
    });
    userRepository.updatePasswordAndClearOtp.mockResolvedValue(true);
    authSessionService.logoutAll.mockResolvedValue(undefined);

    await expect(
      service.resetPasswordWithOtp({
        email: 'taylor@example.com',
        otp: '123456',
        newPassword: 'new-password',
      }),
    ).resolves.toEqual({ message: 'Password reset successfully' });
    expect(userRepository.updatePasswordAndClearOtp).toHaveBeenCalledWith(
      'user-id',
      expect.any(String),
      otpHash,
    );
    expect(authSessionService.logoutAll).toHaveBeenCalledWith('user-id');
  });

  it('invalidates an OTP after the fifth failed attempt', async () => {
    userRepository.findByEmailWithPasswordResetOtp.mockResolvedValue({
      id: 'user-id',
      status: 'ACTIVE',
      isActive: true,
      passwordResetOtpHash: createHash('sha256').update('123456').digest('hex'),
      passwordResetOtpExpiresAt: new Date(Date.now() + 60_000),
      passwordResetOtpAttempts: 4,
    });
    userRepository.incrementOtpAttempts.mockResolvedValue(5);

    await expect(
      service.verifyResetOtp({ email: 'taylor@example.com', otp: '654321' }),
    ).rejects.toThrow('Too many failed attempts. Please request a new OTP.');
    expect(userRepository.clearPasswordResetOtp).toHaveBeenCalledWith('user-id');
  });

  it('updates the password, revokes old sessions, and creates a new session', async () => {
    const user = {
      id: 'user-id',
      username: 'Taylor',
      email: 'taylor@example.com',
      status: 'ACTIVE',
      isActive: true,
      passwordHash: await bcrypt.hash('CurrentPassword!', 4),
      roles: [],
    };
    const session = { user: {}, tokens: {} };
    userRepository.findById.mockResolvedValue(user);
    userRepository.updatePasswordAndClearOtp.mockResolvedValue(true);
    authSessionService.logoutAll.mockResolvedValue(undefined);
    authSessionService.create.mockResolvedValue(session);

    await expect(
      service.updatePassword(
        'user-id',
        {
          currentPassword: 'CurrentPassword!',
          newPassword: 'NextPassword!',
        },
        { userAgent: 'Browser' },
      ),
    ).resolves.toBe(session);
    expect(userRepository.updatePasswordAndClearOtp).toHaveBeenCalledWith(
      'user-id',
      expect.any(String),
    );
    expect(authSessionService.logoutAll).toHaveBeenCalledWith('user-id');
    expect(authSessionService.create).toHaveBeenCalledWith(user, {
      userAgent: 'Browser',
    });
  });
});
