import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema.js';
import { IamFacadeService } from './iam.facade.js';
import { UserModule } from '../../user/user.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { TenantGuard } from './guards/tenant.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { RoleRepository } from './role.repository.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
    ]),
    UserModule,
    OrganizationModule,
  ],
  providers: [IamFacadeService, TenantGuard, PermissionsGuard, RoleRepository],
  exports: [IamFacadeService, TenantGuard, PermissionsGuard, RoleRepository],
})
export class IamModule {}
