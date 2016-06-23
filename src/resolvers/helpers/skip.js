import { GraphQLInt } from 'graphql/type';

export const skipHelperArgs = {
  skip: {
    name: 'skip',
    type: GraphQLInt,
  },
};

export function skipHelper(resolveParams) {
  const skip = resolveParams.args && resolveParams.args.skip;
  if (skip > 0) {
    resolveParams.cursor = resolveParams.cursor.skip(skip); // eslint-disable-line
  }
}
