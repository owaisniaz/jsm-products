import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../user/user.repository.js';
import {
  LoginDto,
  UserDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type UpdatePasswordDto,
  type VerifyResetOtpDto,
} from './dtos/user.dto.js';
import type { AuthSession, SessionMetadata } from './types.js';
import { AuthSessionService } from './auth-session.service.js';
import { IamFacadeService } from '../modules/iam/iam.facade.js';
import { OrganizationFacadeService } from '../modules/organization/organization.facade.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authSessionService: AuthSessionService,
    @Optional() private readonly iamFacade: IamFacadeService | null,
    @Optional() private readonly organizationFacade: OrganizationFacadeService | null,
    @Optional() private readonly tokenService: TokenService | null,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async signup(
    data: UserDto,
    metadata: SessionMetadata = {},
  ): Promise<AuthSession> {
    const username = data.username.trim();
    const email = data.email.trim().toLowerCase();
    if (await this.userRepository.findByEmail(email, true)) {
      throw new ConflictException('An account with this email already exists');
    }
    let user: Awaited<ReturnType<UserRepository['create']>>;
    user = await this.userRepository.create({
      username,
      email,
      password: data.password,
      ...(data.photo === undefined ? {} : { photo: data.photo }),
    });

    return this.authSessionService.create(user, metadata);
  }

  async signin(
    data: LoginDto,
    metadata: SessionMetadata = {},
  ): Promise<AuthSession> {
    const email = data.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);

    if (
      !user ||
      user.status === 'SUSPENDED' ||
      user.status === 'INVITED' ||
      (Object.hasOwn(user, 'isActive') && !user.isActive)
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const passwordHash = user.passwordHash ?? user.password;
    if (!passwordHash || !(await bcrypt.compare(data.password, passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (data.companyCode) {
      if (!this.organizationFacade) {
        throw new UnauthorizedException('Company sign-in is unavailable');
      }
      const company = await this.organizationFacade.findCompanyByCode(data.companyCode);
      if (!company) throw new UnauthorizedException('Invalid company code');
      const membership = user.memberships?.find((item) =>
        item.companyId.toString() === company.id,
      );
      const isOwner =
        membership?.accountType === 'OWNER' ||
        company.ownerUserId.toString() === user.id;
      if (!membership && !isOwner) {
        throw new UnauthorizedException('User is not a member of this company');
      }
      return this.authSessionService.create(user, metadata, {
        activeCompanyId: company.id,
        accountType: isOwner ? 'OWNER' : 'STAFF',
      });
    }

    return this.authSessionService.create(user, metadata);
  }

  async acceptInvite(
    token: string,
    password: string,
    metadata: SessionMetadata = {},
  ): Promise<AuthSession> {
    if (!this.tokenService || !this.iamFacade) {
      throw new UnauthorizedException('Invite acceptance is unavailable');
    }
    const invite = await this.tokenService.verifyInvite(token);
    const user = await this.iamFacade.acceptInvite(invite.userId, password);
    if (!user) throw new UnauthorizedException('Invite is no longer valid');
    return this.authSessionService.create(user, metadata, {
      activeCompanyId: invite.companyId,
      accountType: 'STAFF',
    });
  }

  async forgotPassword(
    data: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const message =
      'If an account exists with this email, a 6-digit verification code has been sent.';
    const email = data.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.status !== 'ACTIVE' || !user.isActive) {
      return { message };
    }

    const rawOtp = randomInt(100000, 1000000).toString();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const saved = await this.userRepository.setPasswordResetOtp(
      user.id,
      otpHash,
      expiresAt,
    );
    if (saved) {
      this.eventEmitter.emit('auth.password_reset_otp_requested', {
        email,
        rawOtp,
        expiresInMinutes: 10,
      });
    }
    return { message };
  }

  async verifyResetOtp(
    data: VerifyResetOtpDto,
  ): Promise<{ message: string }> {
    await this.getUserWithValidResetOtp(data.email, data.otp);
    return { message: 'Verification code is valid' };
  }

  async resetPasswordWithOtp(
    data: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.getUserWithValidResetOtp(data.email, data.otp);
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    const updated = await this.userRepository.updatePasswordAndClearOtp(
      user.id,
      passwordHash,
      user.passwordResetOtpHash ?? undefined,
    );
    if (!updated) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    await this.authSessionService.logoutAll(user.id);
    return { message: 'Password reset successfully' };
  }

  async updatePassword(
    userId: string,
    data: UpdatePasswordDto,
    metadata: SessionMetadata = {},
  ): Promise<AuthSession> {
    const user = await this.userRepository.findById(userId);
    const currentPasswordHash = user?.passwordHash ?? user?.password;
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !user.isActive ||
      !currentPasswordHash ||
      !(await bcrypt.compare(data.currentPassword, currentPasswordHash))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);
    const updated = await this.userRepository.updatePasswordAndClearOtp(
      userId,
      newPasswordHash,
    );
    if (!updated) {
      throw new UnauthorizedException('Unable to update password');
    }

    await this.authSessionService.logoutAll(userId);
    return this.authSessionService.create(user, metadata);
  }

  refresh(refreshToken: string): Promise<AuthSession> {
    return this.authSessionService.refresh(refreshToken);
  }

  logout(refreshToken: string): Promise<void> {
    return this.authSessionService.logout(refreshToken);
  }

  logoutAll(userId: string): Promise<void> {
    return this.authSessionService.logoutAll(userId);
  }

  sessions(
    userId: string,
    currentRefreshToken?: string,
  ) {
    return this.authSessionService.listActiveSessions(
      userId,
      currentRefreshToken,
    );
  }

  revokeSession(userId: string, jti: string): Promise<void> {
    return this.authSessionService.revokeSession(userId, jti);
  }

  private async getUserWithValidResetOtp(email: string, otp: string) {
    const user = await this.userRepository.findByEmailWithPasswordResetOtp(
      email,
    );
    if (!user || user.status !== 'ACTIVE' || !user.isActive) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    if ((user.passwordResetOtpAttempts ?? 0) >= 5) {
      await this.userRepository.clearPasswordResetOtp(user.id);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }
    if (
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpiresAt ||
      user.passwordResetOtpExpiresAt.getTime() <= Date.now()
    ) {
      await this.userRepository.clearPasswordResetOtp(user.id);
      throw new BadRequestException('Invalid or expired verification code');
    }

    const incomingHash = Buffer.from(this.hashOtp(otp), 'hex');
    const storedHash = Buffer.from(user.passwordResetOtpHash, 'hex');
    if (
      incomingHash.length !== storedHash.length ||
      !timingSafeEqual(incomingHash, storedHash)
    ) {
      const attempts = await this.userRepository.incrementOtpAttempts(user.id);
      if (attempts === null || attempts >= 5) {
        await this.userRepository.clearPasswordResetOtp(user.id);
        throw new BadRequestException(
          'Too many failed attempts. Please request a new OTP.',
        );
      }
      throw new BadRequestException('Invalid verification code');
    }
    return user;
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }
}
