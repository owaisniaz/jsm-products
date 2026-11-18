import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({ _id: false })
export class LeaveQuota {
  @Prop({ type: Number, default: 0 })
  annual: number;

  @Prop({ type: Number, default: 0 })
  paid: number;

  @Prop({ type: Number, default: 0 })
  bonus: number;
}

export const LeaveQuotaSchema = SchemaFactory.createForClass(LeaveQuota);

@Schema({ collection: 'employees', timestamps: true })
export class Employee {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  employeeCode: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  nic: string;

  @Prop({ required: true, trim: true })
  phoneNumber: string;

  @Prop({ type: Date, required: true })
  dateOfBirth: Date;

  @Prop({ type: String, default: '' })
  pictureUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  pictureAssetId: Types.ObjectId | null;

  @Prop({ type: String, default: 'EMPLOYEE', trim: true })
  designation: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null, index: true })
  reportingManagerId: Types.ObjectId | null;

  @Prop({ type: LeaveQuotaSchema, default: () => ({}) })
  leaves: LeaveQuota;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.index({ companyId: 1, userId: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, nic: 1 }, { unique: true });
