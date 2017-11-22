/* @flow */

import type { ExtendedResolveParams } from '../index';

export function projectionHelper(resolveParams: ExtendedResolveParams): void { // eslint-disable-line
  const projection = resolveParams.projection;
  if (projection) {
    // if projection has '*' key, then omit field projection (fetch all fields from database)
    if (projection['*']) {
      return;
    }
    const flatProjection = {};
    Object.keys(projection).forEach(key => {
      const val = (projection[key]: any);
      if (val && (val.$meta || val.$slice || val.$elemMatch)) {
        // pass MongoDB projection operators https://docs.mongodb.com/v3.2/reference/operator/projection/meta/
        flatProjection[key] = val;
      } else {
        // if not projection operator, then flatten projection
        flatProjection[key] = !!val;
      }
    });

    if (Object.keys(flatProjection).length > 0) {
      resolveParams.query = resolveParams.query.select(flatProjection); // eslint-disable-line
    }
  }
}
