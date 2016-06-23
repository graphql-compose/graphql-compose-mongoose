import { GraphQLInt } from 'graphql/type';

export const sortHelperArgs = {
  sort: {
    name: 'sort',
    type: GraphQLInt,
  },
};

export function sortHelper(resolveParams) {
  const sort = resolveParams.args && resolveParams.args.sort;
  if (sort && Object.keys(sort).length > 0) {
    resolveParams.cursor = resolveParams.cursor.sort(sort); // eslint-disable-line
  }
}
