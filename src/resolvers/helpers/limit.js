import { GraphQLInt } from 'graphql/type';

export const limitHelperArgs = {
  limit: {
    name: 'limit',
    type: GraphQLInt,
    defaultValue: 1000,
  },
};

export function limitHelper(query, { limit } = {}) {
  if (limit > 0) {
    query = query.limit(limit); // eslint-disable-line no-param-reassign
  }

  return query;
}
