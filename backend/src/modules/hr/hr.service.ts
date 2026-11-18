import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { IamFacadeService } from '../iam/iam.facade.js';
import { OrganizationFacadeService } from '../organization/organization.facade.js';
import { TokenService } from '../../auth/token.service.js';
import { EmployeeRepository } from './employee.repository.js';
import { AttendanceRepository } from './attendance.repository.js';
import { MediaFacadeService } from '../media/media-facade.service.js';
import type { CreateEmployeeDto, PromoteEmployeeDto } from './hr.schemas.js';
import { EmployeeInvitedEvent } from './employee-invite.event.js';

@Injectable()
export class HrService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly iamFacade: IamFacadeService,
    private readonly organizationFacade: OrganizationFacadeService,
    private readonly employeeRepository: EmployeeRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly mediaFacade: MediaFacadeService,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createEmployee(
    actorUserId: string,
    activeCompanyId: string,
    data: CreateEmployeeDto,
  ): Promise<{ id: string }> {
    const company = await this.organizationFacade.findCompanyForTenant(activeCompanyId);
    if (!company) throw new Error('Active company not found');

    if (data.pictureAssetId) {
      await this.mediaFacade.commitAsset(
        data.pictureAssetId,
        actorUserId,
        undefined,
        activeCompanyId,
      );
    }

    const session = await this.connection.startSession();
    try {
      let employeeId = '';
      await session.withTransaction(async () => {
        const user = await this.iamFacade.findOrCreateInvited(
          data.email,
          {
            companyId: company._id,
            groupId: company.groupId,
            roleIds: data.roleIds.map((id) => new Types.ObjectId(id)),
          },
          session,
        );
        const employee = await this.employeeRepository.create({
          userId: user._id,
          companyId: company._id,
          employeeCode: data.employeeCode,
          fullName: data.fullName,
          nic: data.nic,
          phoneNumber: data.phoneNumber,
          dateOfBirth: data.dateOfBirth,
          ...(data.pictureAssetId !== undefined && {
            pictureAssetId: new Types.ObjectId(data.pictureAssetId),
          }),
          ...(data.designation !== undefined && { designation: data.designation }),
          ...(data.reportingManagerId
            ? { reportingManagerId: new Types.ObjectId(data.reportingManagerId) }
            : {}),
        }, session);
        employeeId = employee.id;

        const inviteToken = await this.tokenService.signInvite({
          userId: user.id,
          companyId: company.id,
          companyCode: company.companyCode,
        });
        this.eventEmitter.emit(
          'employee.invited',
          new EmployeeInvitedEvent(data.email, inviteToken, company.companyCode),
        );
      });
      return { id: employeeId };
    } finally {
      await session.endSession();
    }
  }

  async getMe(userId: string, companyId: string) {
    const employee = await this.employeeRepository.findByUserAndCompany(userId, companyId);
    if (!employee) throw new Error('Employee profile not found');
    const attendance = await this.attendanceRepository.recent(companyId, employee.id);
    return { employee, attendance };
  }

  async promote(
    employeeId: string,
    companyId: string,
    data: PromoteEmployeeDto,
  ) {
    const employee = await this.employeeRepository.findByIdInCompany(employeeId, companyId);
    if (!employee) throw new Error('Employee not found');
    await this.iamFacade.addMembershipRole(
      employee.userId.toString(),
      companyId,
      data.roleIds,
    );
    const promoted = await this.employeeRepository.promote(
      employeeId,
      companyId,
      data.designation,
      data.reportingManagerId ?? null,
    );
    if (!promoted) throw new Error('Employee promotion failed');
    return promoted;
  }
}
