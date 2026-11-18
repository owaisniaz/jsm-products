import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type OrganizationGroupDocument = HydratedDocument<OrganizationGroup>;

@Schema({ collection: 'company_groups', timestamps: true })
export class OrganizationGroup {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const OrganizationGroupSchema =
  SchemaFactory.createForClass(OrganizationGroup);
