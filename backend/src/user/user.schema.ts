
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
export type UserDocument = HydratedDocument<User>;

export interface RefreshSessionData {
  jti: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
  lastUsedAt: Date;
  revokedAt: Date | null;
}

@Schema({ _id: false })
export class TenantMembership {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true })
  companyId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null })
  groupId: mongoose.Types.ObjectId | null;

  @Prop({ type: String, enum: ['OWNER', 'STAFF'], default: 'STAFF' })
  accountType: 'OWNER' | 'STAFF';

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    default: [],
  })
  roles: mongoose.Types.ObjectId[];
}

export const TenantMembershipSchema =
  SchemaFactory.createForClass(TenantMembership);

@Schema({ _id: false })
export class RefreshSession {
  @Prop({ required: true })
  jti: string;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: String, default: null })
  ip!: string | null;

  @Prop({ type: Date, default: Date.now })
  lastUsedAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;
}

export const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSession);

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, trim: true, minLength: 3, maxLength: 25, default: null })
  username!: string | null;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, default: null })
  password!: string;

  @Prop({ type: String, default: null })
  passwordHash!: string | null;

  @Prop({
    type: String,
    enum: ['INVITED', 'ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE',
  })
  status!: 'INVITED' | 'ACTIVE' | 'SUSPENDED';

  @Prop({ type: [TenantMembershipSchema], default: [] })
  memberships!: TenantMembership[];

  @Prop({ required: false })
  photo!: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset', default: null })
  pictureAssetId!: mongoose.Types.ObjectId | null;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    default: [],
  })
  roles!: mongoose.Types.ObjectId[];

  @Prop({ type: String, default: null })
  otp!: string | null;

  @Prop({ type: Date, default: null })
  otpExpires!: Date | null;

  @Prop({ type: String, default: null, select: false })
  passwordResetOtpHash!: string | null;

  @Prop({ type: Date, default: null, select: false })
  passwordResetOtpExpiresAt!: Date | null;

  @Prop({ type: Number, default: 0, select: false })
  passwordResetOtpAttempts!: number;

  @Prop({ type: [RefreshSessionSchema], default: [], select: false })
  refreshSessions!: RefreshSession[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// PRE middleware
UserSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified('passwordHash') && this.passwordHash) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
});

// POST middleware
UserSchema.post('save', function (doc) {
  console.log('User saved successfully:', doc.username);
});
