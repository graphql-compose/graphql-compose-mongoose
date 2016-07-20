/* @flow */

import type {
  ExtendedResolveParams,
} from '../../definition';

export function projectionHelper(resolveParams: ExtendedResolveParams): void {
  const projection = resolveParams.projection;
  if (projection) {
    const flatProjection = {};
    Object.keys(projection).forEach(key => {
      flatProjection[key] = !!projection[key];
    });
    resolveParams.query = resolveParams.query.select(flatProjection); // eslint-disable-line
  }
}
