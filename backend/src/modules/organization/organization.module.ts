import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthSecurityModule } from '../../auth/auth-security.module.js';
import { Company, CompanySchema } from '../../companies/company.schema.js';
import { Group, GroupSchema } from '../../groups/group.schema.js';
import { OrganizationFacadeService } from './organization.facade.js';
import { GroupsModule } from '../../groups/groups.module.js';
import { OrganizationController } from './organization.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Group.name, schema: GroupSchema },
    ]),
    GroupsModule,
    AuthSecurityModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationFacadeService],
  exports: [OrganizationFacadeService],
})
export class OrganizationModule {}
