/* @flow */

import type {
  ExtendedResolveParams,
} from '../../definition';

export function projectionHelper(resolveParams: ExtendedResolveParams): void {
  const projection = resolveParams.projection;
  if (projection) {
    const flatProjection = {};
    Object.keys(projection).forEach((key) => {
      if (projection[key].$meta || projection[key].$slice || projection[key].$elemMatch) {
        // pass MongoDB projection operators https://docs.mongodb.com/v3.2/reference/operator/projection/meta/
        flatProjection[key] = projection[key];
      } else {
        // if not projection operator, then flatten projection
        flatProjection[key] = !!projection[key];
      }
    });
    resolveParams.query = resolveParams.query.select(flatProjection); // eslint-disable-line
  }
}
