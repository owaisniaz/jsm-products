import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryBoolean = z.preprocess(
  (value: unknown) =>
    value === 'true' ? true : value === 'false' ? false : value,
  z.boolean().optional(),
);

export const ListGroupsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    isActive: queryBoolean,
    sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export class ListGroupsQueryDto extends createZodDto(ListGroupsQuerySchema) {}
