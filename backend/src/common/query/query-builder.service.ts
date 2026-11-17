import { Injectable } from '@nestjs/common';
import type { Model } from 'mongoose';
import { buildQuery } from './build-query.js';
import type { QueryConfig } from './query-config.js';
import type { FilterQuery, PaginatedResult, PaginateOptions } from './types.js';
import type { ParsedListQuery } from './types.js';

@Injectable()
export class QueryBuilderService {
  async paginate<T>(
    model: Model<T>,
    query: ParsedListQuery,
    config: QueryConfig,
    options: PaginateOptions<T> = {},
  ): Promise<PaginatedResult<T>> {
    const built = buildQuery(query, config);
    const filter: FilterQuery<T> = options.baseFilter
      ? ({ $and: [built.filter, options.baseFilter] } as FilterQuery<T>)
      : (built.filter as FilterQuery<T>);

    const findQuery = model
      .find(filter)
      .sort(built.sort)
      .select(built.projection)
      .skip(built.skip)
      .limit(built.limit)
      .lean()
      .exec();

    const totalQuery = options.includeTotal === false
      ? Promise.resolve(0)
      : model.countDocuments(filter).exec();

    const [results, total] = await Promise.all([findQuery, totalQuery]);
    const totalPages = options.includeTotal === false ? 0 : Math.ceil(total / built.limit);

    return {
      status: 'success',
      results,
      total,
      page: built.page,
      limit: built.limit,
      totalPages,
      data: results,
    };
  }
}
