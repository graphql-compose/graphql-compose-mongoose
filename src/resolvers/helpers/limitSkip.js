import { GraphQLInt } from 'graphql/type';

export const limitSkipHelperArgs = {
  limit: {
    name: 'limit',
    type: GraphQLInt,
    defaultValue: 1000,
  },
  skip: {
    name: 'skip',
    type: GraphQLInt,
  },
};

export function limitSkipHelper(query, { limit, skip }) {
  if (limit > 0) {
    query = query.limit(limit);
  }
  if (skip > 0) {
    query = query.skip(skip);
  }

  return query;
}
