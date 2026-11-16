import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    groupId: z.string().trim().nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .strict();

export class UpdateCompanyDto extends createZodDto(UpdateCompanySchema) {}
