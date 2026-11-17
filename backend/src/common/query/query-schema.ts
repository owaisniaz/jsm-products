import { Types } from 'mongoose';
import { z } from 'zod';
import type { FieldType, QueryConfig } from './query-config.js';

export function createReservedQuerySchema(config: QueryConfig) {
  const defaultLimit = config.defaultLimit ?? 20;
  const maxLimit = config.maxLimit ?? 100;

  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .default(defaultLimit)
      .transform((value) => Math.min(value, maxLimit)),
    sort: z.string().optional(),
    fields: z.string().optional(),
  }).strict();
}

export const reservedQuerySchema = createReservedQuerySchema({
  filterable: {},
  sortable: [],
  selectable: [],
  defaultSort: '-createdAt',
  defaultLimit: 20,
  maxLimit: 100,
});

export function createValueSchema(type: FieldType) {
  switch (type) {
    case 'number':
      return z.coerce.number();
    case 'boolean':
      return z.enum(['true', 'false']).transform((value) => value === 'true');
    case 'date':
      return z.coerce.date();
    case 'objectId':
      return z.string().refine((value) => Types.ObjectId.isValid(value), {
        message: 'Invalid ObjectId',
      });
    case 'string':
      return z.string();
  }
}

export function createFilterSchema(config: QueryConfig) {
  const shape: Record<string, z.ZodType> = {};

  for (const [field, fieldType] of Object.entries(config.filterable)) {
    const valueSchema = createValueSchema(fieldType);
    const operatorShape: Record<string, z.ZodType> = {};
    const operators = ['gte', 'gt', 'lte', 'lt', 'ne', 'in', 'nin', 'eq'] as const;

    for (const operator of operators) {
      if ((operator === 'gte' || operator === 'gt' || operator === 'lte' || operator === 'lt')
        && fieldType !== 'number' && fieldType !== 'date') {
        continue;
      }
      if (operator === 'in' || operator === 'nin') {
        operatorShape[operator] = z.union([
          z.string(),
          z.array(valueSchema),
        ]).transform((value, ctx) => {
          const items = typeof value === 'string'
            ? value.split(',').map((item) => item.trim()).filter(Boolean)
            : value;
          const parsed = z.array(valueSchema).safeParse(items);
          if (!parsed.success) {
            ctx.addIssue({
              code: 'custom',
              message: 'Invalid list value',
            });
            return z.NEVER;
          }
          return parsed.data;
        });
      } else {
        operatorShape[operator] = valueSchema;
      }
    }

    const operatorSchema = z.object(operatorShape).partial();
    const strictObject = config.unknownKeys === 'ignore'
      ? operatorSchema.strip()
      : operatorSchema.strict();

    shape[field] = z.union([
      valueSchema,
      z.array(valueSchema),
      strictObject,
    ]).optional();
  }

  const objectSchema = z.object(shape);
  // Allow reject/ignore to be applied consistently to unknown filter fields.
  if (config.unknownKeys === 'ignore') {
    return objectSchema.strip().transform((result) => {
      const filtered: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(result)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)
          && Object.keys(value).length === 0) {
          continue;
        }
        filtered[field] = value;
      }
      return filtered;
    });
  }
  return objectSchema.strict();
}

export type ReservedQuery = z.infer<ReturnType<typeof createReservedQuerySchema>>;
export type FilterQueryInput = z.infer<ReturnType<typeof createFilterSchema>>;
