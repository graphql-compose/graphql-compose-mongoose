import type { ExtendedResolveParams } from '../index';
import type { AliasesMap } from './aliases';

export function projectionHelper(
  resolveParams: ExtendedResolveParams,
  aliases: AliasesMap | false
): void {
  const projection = resolveParams.projection;
  if (projection) {
    // if projection has '*' key, then omit field projection (fetch all fields from database)
    if (projection['*']) {
      return;
    }
    const flatProjection: Record<string, any> = {};
    Object.keys(projection).forEach((key) => {
      const val = projection[key];
      if (val && (val.$meta || val.$slice || val.$elemMatch)) {
        // pass MongoDB projection operators https://docs.mongodb.com/v3.2/reference/operator/projection/meta/
        flatProjection[key] = val;
      } else {
        // if not projection operator, then flatten projection
        flatProjection[key] = !!val;
      }
    });

    if (aliases) {
      Object.keys(flatProjection).forEach((k) => {
        if (aliases[k]) {
          flatProjection[aliases[k]] = true;
          delete flatProjection[k];
        }
      });
    }

    if (Object.keys(flatProjection).length > 0) {
      resolveParams.query = resolveParams.query.select(flatProjection);
    }
  }
}
