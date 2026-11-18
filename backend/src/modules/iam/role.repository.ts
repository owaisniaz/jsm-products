import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { Role, type RoleDocument } from './schemas/role.schema.js';

@Injectable()
export class RoleRepository {
  constructor(@InjectModel(Role.name) private readonly model: Model<Role>) {}

  findByIds(roleIds: Types.ObjectId[]): Promise<RoleDocument[]> {
    return this.model.find({ _id: { $in: roleIds } }).exec();
  }

  findByCompanyAndName(
    companyId: string,
    name: string,
  ): Promise<RoleDocument | null> {
    return this.model.findOne({
      companyId: new Types.ObjectId(companyId),
      name,
    }).exec();
  }

  create(
    companyId: string,
    name: string,
    permissions: string[],
  ): Promise<RoleDocument> {
    return this.model.create({
      companyId: new Types.ObjectId(companyId),
      name,
      permissions,
    });
  }
}
