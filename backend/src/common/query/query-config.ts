export type UnknownKeysMode = 'reject' | 'ignore';
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'objectId';

export interface QueryConfig {
  filterable: Record<string, FieldType>;
  sortable: string[];
  selectable: string[];
  defaultSort: string;
  defaultLimit?: number;
  maxLimit?: number;
  unknownKeys?: UnknownKeysMode;
}
