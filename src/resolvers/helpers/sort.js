import { GraphQLInt } from 'graphql/type';

export const sortHelperArgsGen = (model) => {
  return {
    sort: {
      name: 'sort',
      type: GraphQLInt, // TODO
    },
  };
};

export function sortHelper(resolveParams) {
  const sort = resolveParams.args && resolveParams.args.sort;
  if (sort && Object.keys(sort).length > 0) {
    resolveParams.cursor = resolveParams.cursor.sort(sort); // eslint-disable-line
  }
}
