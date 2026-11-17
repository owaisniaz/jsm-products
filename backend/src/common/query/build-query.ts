import { BadRequestException } from '@nestjs/common';
import type { QueryConfig } from './query-config.js';
import type { BuiltQuery, MongoProjection, MongoSort, ParsedListQuery } from './types.js';

const OPERATORS: Record<string, string> = {
  gte: '$gte',
  gt: '$gt',
  lte: '$lte',
  lt: '$lt',
  ne: '$ne',
  in: '$in',
  nin: '$nin',
  eq: '$eq',
};

export function buildQuery(
  parsedQuery: ParsedListQuery | Record<string, unknown>,
  config: QueryConfig,
): BuiltQuery {
  const filter: Record<string, unknown> = {};
  const rawFilters =
    'filters' in parsedQuery && typeof parsedQuery.filters === 'object'
      ? parsedQuery.filters as Record<string, unknown>
      : parsedQuery;

  for (const [field, value] of Object.entries(rawFilters ?? {})) {
    if (field === 'page' || field === 'limit' || field === 'sort' || field === 'fields') continue;
    if (field.startsWith('$') || field.includes('.')) {
      throw new BadRequestException(`Unsupported query key: ${field}`);
    }
    if (!Object.hasOwn(config.filterable, field)) {
      if (config.unknownKeys === 'ignore') continue;
      throw new BadRequestException(`Unknown filter field: ${field}`);
    }

    if (Array.isArray(value)) {
      filter[field] = { $in: value };
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      const operators: Record<string, unknown> = {};
      for (const [operator, operatorValue] of Object.entries(value as Record<string, unknown>)) {
        const mongoOperator = OPERATORS[operator];
        if (!mongoOperator) throw new BadRequestException(`Unknown query operator: ${operator}`);
        operators[mongoOperator] = operatorValue;
      }
      filter[field] = operators;
      continue;
    }
    filter[field] = value;
  }

  const sort: MongoSort = {};
  const sortValue =
    typeof parsedQuery.sort === 'string' ? parsedQuery.sort : config.defaultSort;
  for (const item of sortValue.split(',').map((value) => value.trim()).filter(Boolean)) {
    const descending = item.startsWith('-');
    const field = descending ? item.slice(1) : item;
    if (!config.sortable.includes(field)) {
      throw new BadRequestException(`Unknown sort field: ${field}`);
    }
    sort[field] = descending ? -1 : 1;
  }
  // Stable pagination requires a deterministic final order.
  sort._id = sort._id ?? 1;

  const projection: MongoProjection = {};
  const fields =
    typeof parsedQuery.fields === 'string'
      ? parsedQuery.fields
      : '';
  const requested = fields.split(',').map((value) => value.trim()).filter(Boolean);
  if (requested.length > 0) {
    for (const field of requested) {
      if (!config.selectable.includes(field)) {
        throw new BadRequestException(`Unknown selectable field: ${field}`);
      }
      projection[field] = 1;
    }
  } else {
    for (const field of config.selectable) projection[field] = 1;
  }

  const rawPage = parsedQuery.page;
  const page =
    typeof rawPage === 'number' && Number.isInteger(rawPage) && rawPage >= 1
      ? rawPage
      : 1;
  const defaultLimit = config.defaultLimit ?? 20;
  const maxLimit = config.maxLimit ?? 100;
  const rawLimit = parsedQuery.limit;
  const limit =
    typeof rawLimit === 'number' && Number.isInteger(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, maxLimit)
      : defaultLimit;

  return {
    filter,
    sort,
    projection,
    skip: (page - 1) * limit,
    limit,
    page,
  };
}
