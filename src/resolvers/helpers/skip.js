/* @flow */

import type { ComposeFieldConfigArgumentMap, ExtendedResolveParams } from '../../definition';

export const skipHelperArgs = (): ComposeFieldConfigArgumentMap => {
  return {
    skip: {
      name: 'skip',
      type: 'Int',
    },
  };
};

export function skipHelper(resolveParams: ExtendedResolveParams): void {
  const skip = parseInt(resolveParams && resolveParams.args && resolveParams.args.skip, 10);
  if (skip > 0) {
    resolveParams.query = resolveParams.query.skip(skip); // eslint-disable-line
  }
}
