import { GraphQLInt } from 'graphql/type';

export const sortHelperArgs = {
  sort: {
    name: 'sort',
    type: GraphQLInt,
  },
};

export function sortHelper(query, { sort }) {
  if (sort && Object.keys(sort).length > 0) {
    query = query.sort(sort); // eslint-disable-line no-param-reassign
  }

  return query;
}
