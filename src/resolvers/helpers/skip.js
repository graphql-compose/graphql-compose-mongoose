import { GraphQLInt } from 'graphql/type';

export const skipHelperArgs = {
  skip: {
    name: 'skip',
    type: GraphQLInt,
  },
};

export function skipHelper(query, { skip }) {
  if (skip > 0) {
    query = query.skip(skip); // eslint-disable-line no-param-reassign
  }

  return query;
}
