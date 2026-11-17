import type { QueryConfig } from '../common/query/query-config.js';

export const userQueryConfig: QueryConfig = {
  filterable: {
    isActive: 'boolean',
    email: 'string',
    username: 'string',
    roles: 'objectId',
    createdAt: 'date',
  },
  sortable: ['createdAt', 'username'],
  selectable: ['username', 'email', 'isActive', 'roles'],
  defaultSort: '-createdAt',
  defaultLimit: 20,
  maxLimit: 100,
  unknownKeys: 'reject',
};
