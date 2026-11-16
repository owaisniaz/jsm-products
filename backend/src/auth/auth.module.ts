import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module.js';
import { AuthController } from './auth.controller.js';
import { AuthSessionService } from './auth-session.service.js';
import { AuthService } from './auth.service.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { CookieService } from './cookie.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>(
            'JWT_ACCESS_TTL_SECONDS',
          ),
        },
      }),
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    CookieService,
    TokenService,
    AccessTokenGuard,
  ],
  exports: [AccessTokenGuard, CookieService, TokenService],
})
export class AuthModule {}
