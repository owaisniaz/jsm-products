import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Employee, type EmployeeDocument } from './schemas/employee.schema.js';

export interface CreateEmployeeData {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  employeeCode: string;
  fullName: string;
  nic: string;
  phoneNumber: string;
  dateOfBirth: Date;
  pictureAssetId?: Types.ObjectId | null;
  designation?: string;
  reportingManagerId?: Types.ObjectId | null;
}

@Injectable()
export class EmployeeRepository {
  constructor(
    @InjectModel(Employee.name) private readonly model: Model<Employee>,
  ) {}

  async create(
    data: CreateEmployeeData,
    session: ClientSession,
  ): Promise<EmployeeDocument> {
    const [employee] = await this.model.create([data], { session });
    return employee;
  }

  findByUserAndCompany(
    userId: string,
    companyId: string,
  ): Promise<EmployeeDocument | null> {
    return this.model.findOne({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    }).exec();
  }

  findByIdInCompany(
    employeeId: string,
    companyId: string,
  ): Promise<EmployeeDocument | null> {
    return this.model.findOne({
      _id: new Types.ObjectId(employeeId),
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    }).exec();
  }

  promote(
    employeeId: string,
    companyId: string,
    designation: string,
    reportingManagerId: string | null,
  ): Promise<EmployeeDocument | null> {
    return this.model.findOneAndUpdate(
      {
        _id: new Types.ObjectId(employeeId),
        companyId: new Types.ObjectId(companyId),
      },
      {
        $set: {
          designation,
          reportingManagerId: reportingManagerId
            ? new Types.ObjectId(reportingManagerId)
            : null,
        },
      },
      { new: true, runValidators: true },
    ).exec();
  }
}
