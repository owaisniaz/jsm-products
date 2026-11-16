import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Company } from './company.schema.js';

type ActiveCompanyFilter = {
  ownerUserId: Types.ObjectId;
  deletedAt: null;
  _id?: Types.ObjectId | { $ne: Types.ObjectId };
  groupId?: Types.ObjectId | null;
  isActive?: boolean;
  name?: string | RegExp;
  companyCode?: string | RegExp;
  $or?: Array<{ name: RegExp } | { companyCode: RegExp }>;
};

export type CreateCompanyData = Pick<Company, 'name' | 'companyCode'> &
  Partial<Pick<Company, 'groupId' | 'isActive'>>;

export type UpdateCompanyData = Partial<
  Pick<Company, 'name' | 'groupId' | 'isActive'>
>;

export interface CompanyListOptions {
  page: number;
  limit: number;
  search?: string;
  groupId?: string;
  isActive?: boolean;
  sortBy: 'name' | 'createdAt';
  order: 'asc' | 'desc';
}

export type CompanyRecord = Pick<
  Company,
  | 'name'
  | 'companyCode'
  | 'groupId'
  | 'ownerUserId'
  | 'isActive'
  | 'deletedAt'
  | 'createdAt'
  | 'updatedAt'
> & { _id: Types.ObjectId };

@Injectable()
export class CompaniesRepository {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
  ) {}

  create(ownerUserId: string, data: CreateCompanyData) {
    return this.companyModel.create({
      ...data,
      ownerUserId: this.toObjectId(ownerUserId),
      deletedAt: null,
    });
  }

  async list(ownerUserId: string, options: CompanyListOptions) {
    const filter = this.activeFilter(ownerUserId);
    if (options.groupId !== undefined) {
      filter.groupId =
        options.groupId === 'none' ? null : this.toObjectId(options.groupId);
    }
    if (options.isActive !== undefined) {
      filter.isActive = options.isActive;
    }
    if (options.search) {
      const search = new RegExp(this.escapeRegex(options.search), 'i');
      filter.$or = [{ name: search }, { companyCode: search }];
    }

    const direction: 1 | -1 = options.order === 'asc' ? 1 : -1;
    const sort = { [options.sortBy]: direction };
    const [data, total] = await Promise.all([
      this.companyModel
        .find(filter)
        .sort(sort)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .lean()
        .exec(),
      this.companyModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  findById(ownerUserId: string, id: string) {
    return this.companyModel
      .findOne({
        ...this.activeFilter(ownerUserId),
        _id: this.toObjectId(id),
      })
      .lean()
      .exec();
  }

  findDeletedForRestore(ownerUserId: string, id: string) {
    return this.companyModel
      .findOne({
        _id: this.toObjectId(id),
        ownerUserId: this.toObjectId(ownerUserId),
        deletedAt: { $ne: null },
      })
      .lean()
      .exec();
  }

  async existsByCompanyCode(companyCode: string): Promise<boolean> {
    // Company codes remain reserved globally, including after soft deletion.
    return (await this.companyModel.exists({ companyCode }).exec()) !== null;
  }

  async existsByName(
    ownerUserId: string,
    groupId: Types.ObjectId | null,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const filter = this.activeFilter(ownerUserId);
    filter.groupId = groupId;
    filter.name = name;
    if (excludeId) {
      filter._id = { $ne: this.toObjectId(excludeId) };
    }

    return (
      (await this.companyModel
        .exists(filter)
        .collation({ locale: 'en', strength: 2 })
        .exec()) !== null
    );
  }

  update(ownerUserId: string, id: string, changes: UpdateCompanyData) {
    return this.companyModel
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
    return this.companyModel
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

  restore(ownerUserId: string, id: string, groupId: Types.ObjectId | null) {
    return this.companyModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(id),
          ownerUserId: this.toObjectId(ownerUserId),
          deletedAt: { $ne: null },
        },
        { $set: { deletedAt: null, groupId } },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
  }

  private activeFilter(ownerUserId: string): ActiveCompanyFilter {
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
