import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../user/user.repository.js';
import { LoginDto, UserDto } from './dtos/user.dto.js';
import type { AuthSession, SessionMetadata } from './types.js';
import { AuthSessionService } from './auth-session.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authSessionService: AuthSessionService,
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
      !user.isActive ||
      !(await bcrypt.compare(data.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

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
}
