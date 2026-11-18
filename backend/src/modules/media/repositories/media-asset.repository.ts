import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import {
  MediaAsset,
  type MediaAssetDocument,
  type MediaAssetPurpose,
} from '../schemas/media-asset.schema.js';

export interface CreatePendingMediaAssetData {
  companyId: Types.ObjectId | null;
  uploadedBy: Types.ObjectId;
  provider: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  purpose: MediaAssetPurpose;
}

@Injectable()
export class MediaAssetRepository {
  constructor(
    @InjectModel(MediaAsset.name)
    private readonly model: Model<MediaAsset>,
  ) {}

  async createPending(
    data: CreatePendingMediaAssetData,
    session?: ClientSession,
  ): Promise<MediaAssetDocument> {
    const [asset] = await this.model.create(
      [data],
      session ? { session } : undefined,
    );
    return asset;
  }

  findById(
    assetId: string,
    session?: ClientSession,
  ): Promise<MediaAssetDocument | null> {
    const query = this.model.findById(assetId);
    if (session) query.session(session);
    return query.exec();
  }

  markActive(
    assetId: string,
    session?: ClientSession,
  ): Promise<MediaAssetDocument | null> {
    const query = this.model.findOneAndUpdate(
      { _id: assetId, status: 'PENDING' },
      { $set: { status: 'ACTIVE' } },
      { new: true, runValidators: true, ...(session ? { session } : {}) },
    );
    return query.exec();
  }

  markDeleted(
    assetId: string,
    session?: ClientSession,
  ): Promise<MediaAssetDocument | null> {
    const query = this.model.findOneAndUpdate(
      { _id: assetId, status: { $ne: 'DELETED' } },
      { $set: { status: 'DELETED' } },
      { new: true, runValidators: true, ...(session ? { session } : {}) },
    );
    return query.exec();
  }

  findStalePendingAssets(
    olderThanDate: Date,
  ): Promise<MediaAssetDocument[]> {
    return this.model
      .find({ status: 'PENDING', createdAt: { $lt: olderThanDate } })
      .exec();
  }
}
