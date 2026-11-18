import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { AttendanceLog, type AttendanceLogDocument } from './schemas/attendance-log.schema.js';

@Injectable()
export class AttendanceRepository {
  constructor(
    @InjectModel(AttendanceLog.name) private readonly model: Model<AttendanceLog>,
  ) {}

  recent(
    companyId: string,
    employeeId: string,
    limit = 30,
  ): Promise<AttendanceLogDocument[]> {
    return this.model
      .find({
        companyId: new Types.ObjectId(companyId),
        employeeId: new Types.ObjectId(employeeId),
      })
      .sort({ date: -1 })
      .limit(limit)
      .exec();
  }
}
