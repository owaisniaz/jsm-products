import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type AttendanceLogDocument = HydratedDocument<AttendanceLog>;

@Schema({ collection: 'attendance_logs', timestamps: true })
export class AttendanceLog {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, default: null })
  arrivingTime: string | null;

  @Prop({ type: String, default: null })
  leftTime: string | null;

  @Prop({
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'],
    default: 'PRESENT',
  })
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE';
}

export const AttendanceLogSchema = SchemaFactory.createForClass(AttendanceLog);
AttendanceLogSchema.index(
  { companyId: 1, employeeId: 1, date: -1 },
  { unique: true },
);
