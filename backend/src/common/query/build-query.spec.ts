import { BadRequestException } from '@nestjs/common';
import { buildQuery } from './build-query.js';
import type { QueryConfig } from './query-config.js';

const config: QueryConfig = {
  filterable: { role: 'string', status: 'string', createdAt: 'date', price: 'number' },
  sortable: ['createdAt', 'name'],
  selectable: ['name', 'email', 'role'],
  defaultSort: '-createdAt',
  defaultLimit: 20,
  maxLimit: 100,
};

const parsed = (filters: Record<string, unknown>, overrides: Partial<{ page: number; limit: number; sort: string; fields: string }> = {}) => ({
  page: overrides.page ?? 1,
  limit: overrides.limit ?? 20,
  sort: overrides.sort,
  fields: overrides.fields,
  filters,
});

describe('buildQuery', () => {
  it('supports every whitelisted bracket operator', () => {
    const result = buildQuery(parsed({
      price: { gte: 100, gt: 90, lte: 200, lt: 201, ne: 150 },
      role: { in: ['admin', 'editor'], nin: ['banned'], eq: 'admin' },
    }), config);

    expect(result.filter.price).toEqual({
      $gte: 100,
      $gt: 90,
      $lte: 200,
      $lt: 201,
      $ne: 150,
    });
    expect(result.filter.role).toEqual({ $in: ['admin', 'editor'], $nin: ['banned'], $eq: 'admin' });
  });

  it.each([
    parsed({ $where: 'return true' }),
    parsed({ 'role.$ne': 'x' }),
    parsed({ password: 'abc' }),
  ])('rejects Mongo injection and unallowlisted keys', (query) => {
    expect(() => buildQuery(query, config)).toThrow(BadRequestException);
  });

  it('rejects disallowed fields', () => {
    expect(() => buildQuery(parsed({}, { fields: 'password', sort: '-createdAt' }), config)).toThrow(BadRequestException);
    expect(() => buildQuery(parsed({}, { sort: 'password' }), config)).toThrow(BadRequestException);
  });

  it('rejects unknown operators', () => {
    expect(() => buildQuery(parsed({ price: { regex: '10' } }), config)).toThrow(BadRequestException);
  });

  it('rejects unknown fields by default', () => {
    expect(() => buildQuery(parsed({ password: 'abc' }), config)).toThrow(BadRequestException);
  });

  it('ignores unknown fields when configured', () => {
    const result = buildQuery(parsed({ password: 'abc', role: 'admin' }), { ...config, unknownKeys: 'ignore' });
    expect(result.filter).toEqual({ role: 'admin' });
  });

  it('maps array values to $in', () => {
    const result = buildQuery(parsed({ role: ['admin', 'editor'] }), config);
    expect(result.filter).toEqual({ role: { $in: ['admin', 'editor'] } });
  });

  it('clamps limits and normalizes invalid pagination', () => {
    expect(buildQuery(parsed({}, { page: 1, limit: 999 }), config)).toMatchObject({ page: 1, limit: 100, skip: 0 });
    expect(buildQuery(parsed({}, { page: 0, limit: 0 }), config)).toMatchObject({ page: 1, limit: 20, skip: 0 });
  });

  it('always appends _id as a stable sort tiebreaker', () => {
    expect(buildQuery({}, config).sort).toEqual({ createdAt: -1, _id: 1 });
  });

  it('rejects nested objects and $ operator keys', () => {
    expect(() => buildQuery({ role: { $ne: 'admin' } }, config)).toThrow(BadRequestException);
    expect(() => buildQuery({ role: { nested: { value: 'admin' } } }, config)).toThrow(BadRequestException);
  });
});
