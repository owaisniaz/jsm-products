import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type CompanyEntity = HydratedDocument<Company>;

@Schema({ collection: 'companies', timestamps: true })
export class Company {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9_-]{4,20}$/,
    immutable: true,
  })
  companyCode!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Group',
    default: null,
    index: true,
  })
  groupId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerUserId!: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.index({ groupId: 1, name: 1 });
CompanySchema.index(
  { ownerUserId: 1, groupId: 1, name: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
    partialFilterExpression: { deletedAt: null },
  },
);
