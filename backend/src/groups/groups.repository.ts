import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Group } from './group.schema.js';

type ActiveGroupFilter = {
  ownerUserId: Types.ObjectId;
  deletedAt: null;
  isActive?: boolean;
  name?: string | RegExp;
  _id?: Types.ObjectId | { $ne: Types.ObjectId };
};

export type CreateGroupData = Pick<Group, 'name'> &
  Partial<Pick<Group, 'isActive'>>;

export type UpdateGroupData = Partial<Pick<Group, 'name' | 'isActive'>>;

export interface GroupListOptions {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy: 'name' | 'createdAt';
  order: 'asc' | 'desc';
}

export type GroupRecord = Pick<
  Group,
  'name' | 'ownerUserId' | 'isActive' | 'deletedAt' | 'createdAt' | 'updatedAt'
> & { _id: Types.ObjectId };

@Injectable()
export class GroupsRepository {
  constructor(
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
  ) {}

  create(ownerUserId: string, data: CreateGroupData) {
    return this.groupModel.create({
      ...data,
      ownerUserId: this.toObjectId(ownerUserId),
      deletedAt: null,
    });
  }

  async list(ownerUserId: string, options: GroupListOptions) {
    const filter = this.activeFilter(ownerUserId);
    if (options.isActive !== undefined) {
      filter.isActive = options.isActive;
    }
    if (options.search) {
      filter.name = new RegExp(this.escapeRegex(options.search), 'i');
    }

    const direction: 1 | -1 = options.order === 'asc' ? 1 : -1;
    const sort = { [options.sortBy]: direction };
    const [data, total] = await Promise.all([
      this.groupModel
        .find(filter)
        .sort(sort)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .lean()
        .exec(),
      this.groupModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  findById(ownerUserId: string, id: string) {
    return this.groupModel
      .findOne({
        ...this.activeFilter(ownerUserId),
        _id: this.toObjectId(id),
      })
      .lean()
      .exec();
  }

  findDeletedForRestore(ownerUserId: string, id: string) {
    return this.groupModel
      .findOne({
        _id: this.toObjectId(id),
        ownerUserId: this.toObjectId(ownerUserId),
        deletedAt: { $ne: null },
      })
      .lean()
      .exec();
  }

  async existsByName(
    ownerUserId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const filter = this.activeFilter(ownerUserId);
    filter.name = name;
    if (excludeId) {
      filter._id = { $ne: this.toObjectId(excludeId) };
    }

    return (
      (await this.groupModel
        .exists(filter)
        .collation({ locale: 'en', strength: 2 })
        .exec()) !== null
    );
  }

  update(ownerUserId: string, id: string, changes: UpdateGroupData) {
    return this.groupModel
      .findOneAndUpdate(
        {
          ...this.activeFilter(ownerUserId),
          _id: this.toObjectId(id),
        },
        { $set: changes },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
  }

  softDelete(ownerUserId: string, id: string, deletedAt: Date) {
    return this.groupModel
      .findOneAndUpdate(
        {
          ...this.activeFilter(ownerUserId),
          _id: this.toObjectId(id),
        },
        { $set: { deletedAt } },
        { new: true },
      )
      .lean()
      .exec();
  }

  restore(ownerUserId: string, id: string) {
    return this.groupModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(id),
          ownerUserId: this.toObjectId(ownerUserId),
          deletedAt: { $ne: null },
        },
        { $set: { deletedAt: null } },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
  }

  private activeFilter(ownerUserId: string): ActiveGroupFilter {
    return {
      ownerUserId: this.toObjectId(ownerUserId),
      deletedAt: null,
    };
  }

  private toObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
