/* @flow */

import { GraphQLInt } from 'graphql/type';
import type {
  GraphQLFieldConfigArgumentMap,
  ExtendedResolveParams,
} from '../../definition';

export const limitHelperArgs: GraphQLFieldConfigArgumentMap = {
  limit: {
    name: 'limit',
    type: GraphQLInt,
    defaultValue: 1000,
  },
};

export function limitHelper(resolveParams: ExtendedResolveParams): void {
  const limit = parseInt(resolveParams.args && resolveParams.args.limit, 10) || 0;
  if (limit > 0) {
    resolveParams.query = resolveParams.query.limit(limit); // eslint-disable-line
  }
}
