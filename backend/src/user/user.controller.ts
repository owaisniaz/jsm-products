import { Controller, Get } from '@nestjs/common';
import { ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { ListQuery } from '../common/query/list-query.decorator.js';
import { userQueryConfig } from './users.query-config.js';
import type { ParsedListQuery } from '../common/query/types.js';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'fields', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'createdAt[gte]', required: false, type: String })
  @ApiQuery({ name: 'createdAt[lte]', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  list(
    @ListQuery(userQueryConfig)
    query: ParsedListQuery,
  ) {
    return this.userService.paginateUsers(query);
  }
}
