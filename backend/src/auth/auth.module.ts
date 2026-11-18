import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module.js';
import { AuthController } from './auth.controller.js';
import { AuthSessionService } from './auth-session.service.js';
import { AuthService } from './auth.service.js';
import { AuthSecurityModule } from './auth-security.module.js';
import { IamModule } from '../modules/iam/iam.module.js';
import { OrganizationModule } from '../modules/organization/organization.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthSecurityModule,
    UserModule,
    IamModule,
    OrganizationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
  ],
  exports: [AuthSecurityModule],
})
export class AuthModule {}
