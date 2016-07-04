/* @flow */

import { GraphQLInt } from 'graphql';
import type {
  GraphQLFieldConfigArgumentMap,
  ExtendedResolveParams,
} from '../../definition';


export const skipHelperArgs = ():GraphQLFieldConfigArgumentMap => {
  return {
    skip: {
      name: 'skip',
      type: GraphQLInt,
    },
  };
};

export function skipHelper(resolveParams: ExtendedResolveParams): void {
  const skip = parseInt(resolveParams && resolveParams.args && resolveParams.args.skip, 10);
  if (skip > 0) {
    resolveParams.query = resolveParams.query.skip(skip); // eslint-disable-line
  }
}
