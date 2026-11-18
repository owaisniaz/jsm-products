import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/access-token.guard.js';
import { AccessTokenGuard } from '../../auth/access-token.guard.js';
import { TenantGuard } from '../iam/guards/tenant.guard.js';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../iam/guards/permissions.guard.js';
import { HrService } from './hr.service.js';
import { CreateEmployeeDto, PromoteEmployeeDto } from './hr.schemas.js';

@Controller('hr/employees')
@UseGuards(AccessTokenGuard, TenantGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Post()
  @RequirePermissions('employee:create')
  @UseGuards(PermissionsGuard)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateEmployeeDto,
  ) {
    if (!request.user.activeCompanyId) throw new Error('Active company is required');
    return this.hrService.createEmployee(
      request.user.sub,
      request.user.activeCompanyId,
      body,
    );
  }

  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    if (!request.user.activeCompanyId) throw new Error('Active company is required');
    return this.hrService.getMe(request.user.sub, request.user.activeCompanyId);
  }

  @Patch(':id/promote')
  @RequirePermissions('employee:manage_roles')
  @UseGuards(PermissionsGuard)
  promote(
    @Req() request: AuthenticatedRequest,
    @Param('id') employeeId: string,
    @Body() body: PromoteEmployeeDto,
  ) {
    if (!request.user.activeCompanyId) throw new Error('Active company is required');
    return this.hrService.promote(employeeId, request.user.activeCompanyId, body);
  }
}
