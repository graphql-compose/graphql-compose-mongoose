import type { ExtendedResolveParams } from '../index';
import type { AliasesMap } from './aliases';
import dotify from './dotify';

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
    const flatProjection: Record<string, any> = dotify(projection);

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
