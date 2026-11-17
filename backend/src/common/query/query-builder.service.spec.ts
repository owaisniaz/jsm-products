import type { Filter } from 'mongodb';
import type { Model } from 'mongoose';
import { QueryBuilderService } from './query-builder.service.js';
import type { QueryConfig } from './query-config.js';
import type { ParsedListQuery } from './types.js';

interface TestDocument {
  _id: string;
  role: string;
  isDeleted: boolean;
}

type FilterQuery<T> = Filter<T>;

const config: QueryConfig = {
  filterable: { role: 'string' },
  sortable: ['role'],
  selectable: ['role'],
  defaultSort: '-role',
};

describe('QueryBuilderService', () => {
  it('merges baseFilter with $and so client filters cannot override it', async () => {
    let findFilter: FilterQuery<TestDocument> | undefined;
    let countFilter: FilterQuery<TestDocument> | undefined;

    const findExec = vi.fn().mockResolvedValue([{ _id: '1', role: 'admin', isDeleted: false }]);
    const chain = {
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: findExec,
    };
    const model = {
      find(filter: FilterQuery<TestDocument>) {
        findFilter = filter;
        return chain;
      },
      countDocuments(filter: FilterQuery<TestDocument>) {
        countFilter = filter;
        return { exec: vi.fn().mockResolvedValue(1) };
      },
    } as unknown as Model<TestDocument>;

    const service = new QueryBuilderService();
    const query: ParsedListQuery = {
      page: 1,
      limit: 20,
      filters: { role: 'editor' },
    };
    const result = await service.paginate(
      model,
      query,
      config,
      { baseFilter: { isDeleted: false } },
    );

    expect(findFilter).toEqual({
      $and: [{ role: 'editor' }, { isDeleted: false }],
    });
    expect(countFilter).toEqual(findFilter);
    expect(result.results).toHaveLength(1);
  });

  it('can skip the count when includeTotal is false', async () => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    const countDocuments = vi.fn();
    const model = {
      find: vi.fn().mockReturnValue(chain),
      countDocuments,
    } as unknown as Model<TestDocument>;

    const query: ParsedListQuery = { page: 1, limit: 20, filters: {} };
    const result = await new QueryBuilderService().paginate(model, query, config, {
      includeTotal: false,
    });

    expect(countDocuments).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
