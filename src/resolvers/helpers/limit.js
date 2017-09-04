/* @flow */

import type {
  ComposeFieldConfigArgumentMap,
  ExtendedResolveParams,
  LimitHelperArgsOpts,
} from '../../definition';

export const limitHelperArgs = (opts?: LimitHelperArgsOpts): ComposeFieldConfigArgumentMap => {
  return {
    limit: {
      name: 'limit',
      type: 'Int',
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
