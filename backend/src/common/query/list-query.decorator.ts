import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { ZodError } from 'zod';
import type { QueryConfig } from './query-config.js';
import { createFilterSchema, createReservedQuerySchema } from './query-schema.js';
import type { ParsedListQuery } from './types.js';

const RESERVED = new Set(['page', 'limit', 'sort', 'fields']);

function throwZodError(error: ZodError): never {
  throw new BadRequestException({
    message: 'Validation failed',
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

function normalizeQuery(rawQuery: Record<string, unknown>, config: QueryConfig): {
  reserved: Record<string, unknown>;
  filters: Record<string, unknown>;
} {
  const reserved: Record<string, unknown> = {};
  const filters: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawQuery)) {
    if (key.startsWith('$') || key.includes('.')) {
      throwZodError(new ZodError([{
        code: 'custom',
        path: [key],
        message: 'Mongo operators and dot notation are not allowed',
      }]));
    }

    if (RESERVED.has(key)) {
      reserved[key] = value;
      continue;
    }

    const bracketMatch = /^([A-Za-z0-9_-]+)\[(.+)\]$/.exec(key);
    if (bracketMatch) {
      const [, field, operator] = bracketMatch;
      const existing = filters[field];
      filters[field] = typeof existing === 'object' && existing !== null && !Array.isArray(existing)
        ? { ...existing, [operator]: value }
        : { [operator]: value };
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if (Object.keys(nested).some((operator) => operator.startsWith('$') || operator.includes('.'))) {
        throwZodError(new ZodError([{
          code: 'custom',
          path: [key],
          message: 'Mongo operators and dot notation are not allowed',
        }]));
      }
      filters[key] = nested;
    } else {
      filters[key] = value;
    }
  }

  return { reserved, filters };
}

export function ListQuery(config: QueryConfig) {
  return createParamDecorator((_data: unknown, context: ExecutionContext): ParsedListQuery => {
    const request = context.switchToHttp().getRequest<Request>();
    const rawQuery = request.query as Record<string, unknown>;
    const normalized = normalizeQuery(rawQuery, config);

    const reservedResult = createReservedQuerySchema(config).safeParse(normalized.reserved);
    if (!reservedResult.success) throwZodError(reservedResult.error);

    const filterResult = createFilterSchema(config).safeParse(normalized.filters);
    if (!filterResult.success) throwZodError(filterResult.error);

    return {
      ...reservedResult.data,
      filters: filterResult.data as Record<string, unknown>,
    };
  })();
}
