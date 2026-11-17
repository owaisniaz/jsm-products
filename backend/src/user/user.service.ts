import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UserRepository } from './user.repository.js';
import type { User } from './user.schema.js';
import { QueryBuilderService } from '../common/query/query-builder.service.js';
import type { PaginatedResult } from '../common/query/types.js';
import { userQueryConfig } from './users.query-config.js';
import type { ParsedListQuery } from '../common/query/types.js';

@Injectable()
export class UserService {
    constructor(
      private readonly userRepository: UserRepository,
      @InjectModel('User') private readonly userModel: Model<User>,
      private readonly queryBuilder: QueryBuilderService,
    ) { }

    findByEmail(email: string) {
        return this.userRepository.findByEmail(email);
    }

    paginateUsers(query: ParsedListQuery): Promise<PaginatedResult<User>> {
      return this.queryBuilder.paginate(
        this.userModel,
        query,
        userQueryConfig,
        { baseFilter: { deletedAt: null } },
      );
    }
}