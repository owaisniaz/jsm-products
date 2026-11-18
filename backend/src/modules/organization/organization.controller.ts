import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/access-token.guard.js';
import { AccessTokenGuard } from '../../auth/access-token.guard.js';
import { GroupsService } from '../../groups/groups.service.js';
import { CreateGroupDto } from '../../groups/dto/create-group.dto.js';

@Controller('groups')
@UseGuards(AccessTokenGuard)
export class OrganizationController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateGroupDto,
  ) {
    return this.groupsService.create(request.user.sub, body);
  }

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.groupsService.list(request.user.sub, {
      page: 1,
      limit: 100,
      sortBy: 'name',
      order: 'asc',
    });
  }
}
