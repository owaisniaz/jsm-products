import { createFilterSchema, createReservedQuerySchema } from './query-schema.js';
import type { QueryConfig } from './query-config.js';

const config: QueryConfig = {
  filterable: {
    price: 'number',
    active: 'boolean',
    createdAt: 'date',
    role: 'string',
  },
  sortable: ['createdAt'],
  selectable: ['role'],
  defaultSort: '-createdAt',
  defaultLimit: 20,
  maxLimit: 100,
};

describe('query Zod schemas', () => {
  it('coerces number, boolean, and date values', () => {
    const result = createFilterSchema(config).parse({
      price: { gte: '100' },
      active: 'true',
      createdAt: '2025-01-01',
    });
    expect(result.price).toEqual({ gte: 100 });
    expect(result.active).toBe(true);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('parses comma-separated in/nin and arrays', () => {
    const result = createFilterSchema(config).parse({
      role: { in: 'admin,editor', nin: ['banned', 'blocked'] },
    });
    expect(result.role).toEqual({ in: ['admin', 'editor'], nin: ['banned', 'blocked'] });
  });

  it('rejects unknown fields and operators in reject mode', () => {
    expect(() => createFilterSchema(config).parse({ password: 'abc' })).toThrow();
    expect(() => createFilterSchema(config).parse({ role: { regex: 'a' } })).toThrow();
  });

  it('strips unknown fields and operators in ignore mode', () => {
    const result = createFilterSchema({ ...config, unknownKeys: 'ignore' }).parse({
      password: 'abc',
      role: { regex: 'a' },
    });
    expect(result).toEqual({});
  });

  it('rejects gte on a string field', () => {
    expect(() => createFilterSchema(config).parse({ role: { gte: 'a' } })).toThrow();
  });

  it('clamps limit and rejects invalid or small page values', () => {
    const schema = createReservedQuerySchema({ ...config, maxLimit: 100 });
    expect(schema.parse({ limit: '999', page: '2' })).toMatchObject({ limit: 100, page: 2 });
    expect(() => schema.parse({ page: 'abc' })).toThrow();
    expect(() => schema.parse({ page: 0 })).toThrow();
  });
});
