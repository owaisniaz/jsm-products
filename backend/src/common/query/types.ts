import type { Filter } from 'mongodb';

export type FilterQuery<T> = Filter<T>;

export interface ParsedListQuery {
  page: number;
  limit: number;
  sort?: string;
  fields?: string;
  filters: Record<string, unknown>;
}

export type MongoSort = Record<string, 1 | -1>;
export type MongoProjection = Record<string, 0 | 1>;

export interface BuiltQuery {
  filter: Record<string, unknown>;
  sort: MongoSort;
  projection: MongoProjection;
  skip: number;
  limit: number;
  page: number;
}

export interface PaginatedResult<T> {
  status: 'success';
  results: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: T[];
}

export interface PaginateOptions<T> {
  baseFilter?: FilterQuery<T>;
  includeTotal?: boolean;
}
