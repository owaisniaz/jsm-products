import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export const MEDIA_ASSET_PURPOSES = [
  'USER_AVATAR',
  'EMPLOYEE_PICTURE',
  'COMPANY_LOGO',
  'DOCUMENT',
] as const;
export type MediaAssetPurpose = (typeof MEDIA_ASSET_PURPOSES)[number];

export const MEDIA_ASSET_STATUSES = ['PENDING', 'ACTIVE', 'DELETED'] as const;
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];

export type MediaAssetDocument = HydratedDocument<MediaAsset>;

@Schema({ collection: 'media_assets', timestamps: true })
export class MediaAsset {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uploadedBy: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  provider: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  storageKey: string;

  @Prop({ type: String, required: true, trim: true })
  mimeType: string;

  @Prop({ type: Number, required: true, min: 1 })
  sizeBytes: number;

  @Prop({ type: String, enum: MEDIA_ASSET_PURPOSES, required: true })
  purpose: MediaAssetPurpose;

  @Prop({
    type: String,
    enum: MEDIA_ASSET_STATUSES,
    default: 'PENDING',
    index: true,
  })
  status: MediaAssetStatus;
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
