/* @flow */

import type {
  ExtendedResolveParams,
} from '../../definition';

export function projectionHelper(resolveParams: ExtendedResolveParams): void {
  const projection = resolveParams.projection;
  if (projection) {
    resolveParams.query = resolveParams.query.select(projection); // eslint-disable-line
  }
}
