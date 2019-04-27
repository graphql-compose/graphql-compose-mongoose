/* @flow */

import type { ObjectTypeComposerArgumentConfigMapDefinition } from 'graphql-compose';
import type { ExtendedResolveParams } from '../index';

export const skipHelperArgs = (): ObjectTypeComposerArgumentConfigMapDefinition<> => {
  return {
    skip: {
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
