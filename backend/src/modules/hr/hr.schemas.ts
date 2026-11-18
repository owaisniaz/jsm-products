import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateEmployeeSchema = z.object({
  email: z.string().trim().email(),
  employeeCode: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(2).max(100),
  nic: z.string().trim().min(3).max(50),
  phoneNumber: z.string().trim().min(5).max(30),
  dateOfBirth: z.coerce.date(),
  pictureAssetId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  designation: z.string().trim().optional(),
  reportingManagerId: z.string().trim().optional(),
  roleIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).default([]),
}).strict();

export class CreateEmployeeDto extends createZodDto(CreateEmployeeSchema) {}

export const PromoteEmployeeSchema = z.object({
  designation: z.string().trim().min(2).max(100),
  reportingManagerId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  roleIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1),
}).strict();

export class PromoteEmployeeDto extends createZodDto(PromoteEmployeeSchema) {}
