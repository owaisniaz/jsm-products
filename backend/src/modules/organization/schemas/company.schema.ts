import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type OrganizationCompanyDocument = HydratedDocument<OrganizationCompany>;

@Schema({ collection: 'companies', timestamps: true })
export class OrganizationCompany {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  companyCode: string;

  @Prop({ type: Types.ObjectId, ref: 'Group', default: null, index: true })
  groupId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const OrganizationCompanySchema =
  SchemaFactory.createForClass(OrganizationCompany);
OrganizationCompanySchema.index({ groupId: 1, name: 1 });
