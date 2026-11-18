import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type UnifiedUserDocument = HydratedDocument<UnifiedUser>;

export type TenantMembershipDocument = {
  companyId: Types.ObjectId;
  groupId: Types.ObjectId | null;
  accountType: 'OWNER' | 'STAFF';
  roles: Types.ObjectId[];
};

@Schema({ _id: false })
export class TenantMembership {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', default: null })
  groupId: Types.ObjectId | null;

  @Prop({ type: String, enum: ['OWNER', 'STAFF'], default: 'STAFF' })
  accountType: 'OWNER' | 'STAFF';

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Role' }], default: [] })
  roles: Types.ObjectId[];
}

export const TenantMembershipSchema =
  SchemaFactory.createForClass(TenantMembership);

@Schema({ collection: 'users', timestamps: true })
export class UnifiedUser {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ type: String, default: null })
  passwordHash: string | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  pictureAssetId: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: ['INVITED', 'ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE',
  })
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';

  @Prop({ type: [TenantMembershipSchema], default: [] })
  memberships: TenantMembershipDocument[];
}

export const UnifiedUserSchema = SchemaFactory.createForClass(UnifiedUser);
UnifiedUserSchema.index({ 'memberships.companyId': 1 });
