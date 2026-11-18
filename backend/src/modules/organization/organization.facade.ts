import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { Company, type CompanyEntity } from '../../companies/company.schema.js';
import { Group, type GroupEntity } from '../../groups/group.schema.js';

@Injectable()
export class OrganizationFacadeService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
  ) {}

  findCompanyByCode(companyCode: string): Promise<CompanyEntity | null> {
    return this.companyModel.findOne({
      companyCode: companyCode.trim().toUpperCase(),
      isActive: true,
      deletedAt: null,
    }).exec();
  }

  findCompanyForTenant(companyId: string): Promise<CompanyEntity | null> {
    if (!Types.ObjectId.isValid(companyId)) return Promise.resolve(null);
    return this.companyModel.findById(companyId).exec();
  }

  findGroup(groupId: string): Promise<GroupEntity | null> {
    if (!Types.ObjectId.isValid(groupId)) return Promise.resolve(null);
    return this.groupModel.findById(groupId).exec();
  }
}
