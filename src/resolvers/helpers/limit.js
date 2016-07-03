/* @flow */

import { GraphQLInt } from 'graphql';
import type {
  GraphQLFieldConfigArgumentMap,
  ExtendedResolveParams,
  limitHelperArgsOpts,
} from '../../definition';

export const limitHelperArgs = (
  opts: limitHelperArgsOpts
):GraphQLFieldConfigArgumentMap => {
  return {
    limit: {
      name: 'limit',
      type: GraphQLInt,
      defaultValue: (opts && opts.defaultValue) || 1000,
    },
  };
};

export function limitHelper(resolveParams: ExtendedResolveParams): void {
  const limit = parseInt(resolveParams.args && resolveParams.args.limit, 10) || 0;
  if (limit > 0) {
    resolveParams.query = resolveParams.query.limit(limit); // eslint-disable-line
  }
}
