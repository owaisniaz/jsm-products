import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { User, type UserDocument } from '../../user/user.schema.js';

@Injectable()
export class IamUserRepository {
  constructor(@InjectModel(User.name) private readonly model: Model<User>) {}

  findByEmail(email: string, session?: ClientSession): Promise<UserDocument | null> {
    const query = this.model.findOne({ email: email.trim().toLowerCase() });
    return (session ? query.session(session) : query).exec();
  }

  pushRole(
    userId: string,
    companyId: string,
    roleIds: Types.ObjectId[],
  ): Promise<UserDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: userId, 'memberships.companyId': new Types.ObjectId(companyId) },
      { $addToSet: { 'memberships.$[membership].roles': { $each: roleIds } } },
      {
        arrayFilters: [{ 'membership.companyId': new Types.ObjectId(companyId) }],
        new: true,
        runValidators: true,
      },
    ).exec();
  }
}
