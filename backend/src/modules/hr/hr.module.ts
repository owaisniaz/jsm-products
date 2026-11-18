import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthSecurityModule } from '../../auth/auth-security.module.js';
import { IamModule } from '../iam/iam.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { Employee, EmployeeSchema } from './schemas/employee.schema.js';
import { AttendanceLog, AttendanceLogSchema } from './schemas/attendance-log.schema.js';
import { EmployeeRepository } from './employee.repository.js';
import { AttendanceRepository } from './attendance.repository.js';
import { HrService } from './hr.service.js';
import { HrController } from './hr.controller.js';
import { EmployeeInviteListener } from './employee-invite.listener.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: AttendanceLog.name, schema: AttendanceLogSchema },
    ]),
    AuthSecurityModule,
    IamModule,
    OrganizationModule,
  ],
  controllers: [HrController],
  providers: [
    EmployeeRepository,
    AttendanceRepository,
    HrService,
    EmployeeInviteListener,
  ],
  exports: [HrService],
})
export class HrModule {}
