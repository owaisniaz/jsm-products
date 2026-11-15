
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
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
  @Prop({ required: true, trim: true, minLength: 3, maxLength: 25 })
  username: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: false })
  photo!: string;

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

  @Prop({ type: [RefreshSessionSchema], default: [], select: false })
  refreshSessions!: RefreshSession[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// PRE middleware
UserSchema.pre('save', async function () {
  //Only run If password is modified
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12)
});

// POST middleware
UserSchema.post('save', function (doc) {
  console.log('User saved successfully:', doc.username);
});
