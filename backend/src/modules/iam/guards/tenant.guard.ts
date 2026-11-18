import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../auth/access-token.guard.js';
import { IamFacadeService } from '../iam.facade.js';
import { OrganizationFacadeService } from '../../organization/organization.facade.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly iamFacade: IamFacadeService,
    private readonly organizationFacade: OrganizationFacadeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const companyId = request.user.activeCompanyId;
    if (!companyId) throw new ForbiddenException('Active company is required');
    const user = await this.iamFacade.findById(request.user.sub);
    if (!user) throw new ForbiddenException();
    const membership = user.memberships?.find((item) =>
      item.companyId.toString() === companyId,
    );
    if (membership) return true;
    const company = await this.organizationFacade.findCompanyForTenant(companyId);
    if (company?.ownerUserId.toString() === request.user.sub) return true;
    if (company?.groupId) {
      const group = await this.organizationFacade.findGroup(company.groupId.toString());
      if (group?.ownerUserId.toString() === request.user.sub) return true;
    }
    throw new ForbiddenException('User does not belong to the active company');
  }
}
