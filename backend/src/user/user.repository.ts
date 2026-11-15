// user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model } from 'mongoose';
import {
  User,
  type RefreshSessionData,
  type UserDocument,
} from './user.schema.js';

type UserCreate = Pick<User, 'username' | 'email' | 'password'> &
  Partial<Pick<User, 'photo'>>;

type UserListFilter = Partial<Pick<User, 'username' | 'email' | 'isActive'>>;

type UserUpdate = Partial<
  Pick<User, 'username' | 'email' | 'password' | 'photo' | 'isActive' | 'roles'>
>;

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) { }

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

  async addRefreshSession(
    id: string,
    session: RefreshSessionData,
  ): Promise<boolean> {
    await this.userModel
      .updateOne(
        { _id: id, deletedAt: null, isActive: true },
        { $pull: { refreshSessions: { expiresAt: { $lte: new Date() }, revokedAt: null } } },
      )
      .exec();

    const result = await this.userModel
      .updateOne(
        { _id: id, deletedAt: null, isActive: true },
        { $push: { refreshSessions: session } },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  findByIdWithRefreshSessions(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ _id: id, deletedAt: null })
      .select('+refreshSessions')
      .exec();
  }

  async rotateRefreshSession(
    id: string,
    previous: Pick<RefreshSessionData, 'jti' | 'tokenHash'>,
    next: RefreshSessionData,
  ): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        {
          _id: id,
          deletedAt: null,
          isActive: true,
          refreshSessions: {
            $elemMatch: {
              jti: previous.jti,
              tokenHash: previous.tokenHash,
              expiresAt: { $gt: new Date() },
              revokedAt: null,
            },
          },
        },
        {
          $set: {
            'refreshSessions.$.jti': next.jti,
            'refreshSessions.$.tokenHash': next.tokenHash,
            'refreshSessions.$.expiresAt': next.expiresAt,
            'refreshSessions.$.lastUsedAt': next.lastUsedAt,
            'refreshSessions.$.revokedAt': null,
          },
        },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  async revokeRefreshSession(
    id: string,
    session: Pick<RefreshSessionData, 'jti' | 'tokenHash'>,
    revokedAt = new Date(),
  ): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        {
          _id: id,
          refreshSessions: {
            $elemMatch: {
              jti: session.jti,
              tokenHash: session.tokenHash,
              revokedAt: null,
            },
          },
        },
        {
          $set: {
            'refreshSessions.$.revokedAt': revokedAt,
          },
        },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  async revokeAllRefreshSessions(id: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id, deletedAt: null },
        { $set: { 'refreshSessions.$[session].revokedAt': new Date() } },
        { arrayFilters: [{ 'session.revokedAt': null }] },
      )
      .exec();
  }

  async revokeRefreshSessionByJti(id: string, jti: string): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        {
          _id: id,
          refreshSessions: {
            $elemMatch: { jti, revokedAt: null },
          },
        },
        { $set: { 'refreshSessions.$.revokedAt': new Date() } },
      )
      .exec();
    return result.modifiedCount === 1;
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
