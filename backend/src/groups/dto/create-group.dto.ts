import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateGroupSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    isActive: z.boolean().optional(),
  })
  .strict();

export class CreateGroupDto extends createZodDto(CreateGroupSchema) {}
