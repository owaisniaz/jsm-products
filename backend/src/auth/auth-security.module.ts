import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard.js';
import { CookieService } from './cookie.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    ConfigModule,
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
  ],
  providers: [CookieService, TokenService, AccessTokenGuard],
  exports: [CookieService, TokenService, AccessTokenGuard],
})
export class AuthSecurityModule {}
