import { GraphQLInt } from 'graphql/type';

export const limitHelperArgs = {
  limit: {
    name: 'limit',
    type: GraphQLInt,
    defaultValue: 1000,
  },
};

export function limitHelper(resolveParams) {
  const limit = resolveParams.args && resolveParams.args.limit || 0;
  if (limit > 0) {
    resolveParams.cursor = resolveParams.cursor.limit(limit); // eslint-disable-line
  }
}
