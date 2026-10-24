// user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model } from 'mongoose';
import { User, type UserDocument } from './user.schema.js';

type UserCreate = Pick<User, 'username' | 'email' | 'password'> &
  Partial<Pick<User, 'photo'>>;

type UserListFilter = Partial<Pick<User, 'username' | 'email' | 'isActive'>>;

type UserUpdate = Partial<
  Pick<User, 'username' | 'email' | 'password' | 'photo' | 'isActive' | 'roles'>
>;

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  create(data: UserCreate): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  findById(id: string, includeDeleted = false): Promise<UserDocument | null> {
    return this.userModel
      .findOne(includeDeleted ? { _id: id } : { _id: id, deletedAt: null })
      .exec();
  }

  findByEmail(
    email: string,
    includeDeleted = false,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne(
        includeDeleted
          ? { email: email.trim().toLowerCase() }
          : { email: email.trim().toLowerCase(), deletedAt: null },
      )
      .exec();
  }

  update(id: string, changes: UserUpdate): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: changes },
        { new: true, runValidators: true },
      )
      .exec();
  }

  softDelete(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { deletedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  findAll(
    filter: UserListFilter = {},
    includeDeleted = false,
  ): Promise<UserDocument[]> {
    return this.userModel
      .find(includeDeleted ? filter : { ...filter, deletedAt: null })
      .exec();
  }
}
