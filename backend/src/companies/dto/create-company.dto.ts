import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    companyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{4,20}$/),
    groupId: z.string().trim().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export class CreateCompanyDto extends createZodDto(CreateCompanySchema) {}
