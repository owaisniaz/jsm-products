import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateGroupSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    isActive: z.boolean(),
  })
  .partial()
  .strict();

export class UpdateGroupDto extends createZodDto(UpdateGroupSchema) {}
