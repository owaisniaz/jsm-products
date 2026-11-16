import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error.js';
import type { GroupEntity } from './group.schema.js';
import type { GroupRecord } from './groups.repository.js';
import { GroupsRepository } from './groups.repository.js';
import type { CreateGroupDto } from './dto/create-group.dto.js';
import type { ListGroupsQueryDto } from './dto/list-groups-query.dto.js';
import type { UpdateGroupDto } from './dto/update-group.dto.js';

export interface GroupResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupListResponse {
  data: GroupResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type GroupSource = GroupEntity | GroupRecord;

@Injectable()
export class GroupsService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  async create(
    ownerUserId: string,
    data: CreateGroupDto,
  ): Promise<GroupResponse> {
    if (await this.groupsRepository.existsByName(ownerUserId, data.name)) {
      throw new AppError('GROUP_NAME_EXISTS');
    }

    return this.toGroupResponse(
      await this.groupsRepository.create(ownerUserId, data),
    );
  }

  async list(
    ownerUserId: string,
    query: ListGroupsQueryDto,
  ): Promise<GroupListResponse> {
    const { data, total } = await this.groupsRepository.list(ownerUserId, query);

    return {
      data: data.map((group) => this.toGroupResponse(group)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(ownerUserId: string, id: string): Promise<GroupResponse> {
    const group = await this.groupsRepository.findById(ownerUserId, id);
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND');
    }

    return this.toGroupResponse(group);
  }

  async update(
    ownerUserId: string,
    id: string,
    changes: UpdateGroupDto,
  ): Promise<GroupResponse> {
    if (Object.keys(changes).length === 0) {
      throw new AppError('BAD_REQUEST', {
        message: 'Update body must not be empty',
      });
    }
    if (
      changes.name !== undefined &&
      (await this.groupsRepository.existsByName(ownerUserId, changes.name, id))
    ) {
      throw new AppError('GROUP_NAME_EXISTS');
    }

    const group = await this.groupsRepository.update(ownerUserId, id, changes);
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND');
    }

    return this.toGroupResponse(group);
  }

  async softDelete(ownerUserId: string, id: string): Promise<GroupResponse> {
    const group = await this.groupsRepository.softDelete(
      ownerUserId,
      id,
      new Date(),
    );
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND');
    }

    return this.toGroupResponse(group);
  }

  async restore(ownerUserId: string, id: string): Promise<GroupResponse> {
    const deletedGroup = await this.groupsRepository.findDeletedForRestore(
      ownerUserId,
      id,
    );
    if (!deletedGroup) {
      if (await this.groupsRepository.findById(ownerUserId, id)) {
        throw new AppError('BAD_REQUEST', {
          message: 'Group is not deleted',
        });
      }
      throw new AppError('GROUP_NOT_FOUND');
    }

    if (
      await this.groupsRepository.existsByName(ownerUserId, deletedGroup.name)
    ) {
      throw new AppError('GROUP_NAME_EXISTS');
    }

    const group = await this.groupsRepository.restore(ownerUserId, id);
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND');
    }

    return this.toGroupResponse(group);
  }

  private toGroupResponse(group: GroupSource): GroupResponse {
    return {
      id: group._id.toString(),
      name: group.name,
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }
}
