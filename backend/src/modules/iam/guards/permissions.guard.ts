import { Injectable, ForbiddenException, SetMetadata } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../../auth/access-token.guard.js';
import { IamFacadeService } from '../iam.facade.js';
export const REQUIRE_PERMISSIONS = 'requirePermissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly iamFacade: IamFacadeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.get<string[]>(REQUIRE_PERMISSIONS, context.getHandler());
    if (!permissions?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const companyId = request.user.activeCompanyId;
    if (!companyId) throw new ForbiddenException('Active company is required');
    const resolved = await this.iamFacade.getMembershipRolePermissions(request.user.sub, companyId);
    if (resolved.accountType === 'OWNER') return true;
    if (permissions.every((permission) =>
      resolved.permissions.includes(permission),
    )) return true;
    throw new ForbiddenException('Insufficient permissions');
  }
}
