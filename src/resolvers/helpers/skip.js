import { GraphQLInt } from 'graphql/type';

export const skipHelperArgs = {
  skip: {
    name: 'skip',
    type: GraphQLInt,
  },
};

export function skipHelper(query, args = {}) {
  if (args.skip > 0) {
    query = query.skip(args.skip); // eslint-disable-line no-param-reassign
  }

  return query;
}
