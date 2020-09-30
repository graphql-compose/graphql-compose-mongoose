import type { ExtendedResolveParams } from '../index';
import { NestedAliasesMap } from './aliases';
import { isObject } from 'graphql-compose';

export function projectionHelper(
  resolveParams: ExtendedResolveParams,
  aliases?: NestedAliasesMap
): void {
  const projection = resolveParams.projection;
  if (projection) {
    // if projection has '*' key, then omit field projection (fetch all fields from database)
    if (projection['*']) {
      return;
    }

    const flatProjection = dotifyWithAliases(projection, aliases);

    if (Object.keys(flatProjection).length > 0) {
      resolveParams.query = resolveParams.query.select(flatProjection);
    }
  }
}

export type ProjectionOperator = Record<string, any>;
export type FlatDottedObject = Record<string, boolean | ProjectionOperator>;

export function dotifyWithAliases(
  obj: Record<string, any>,
  aliases?: NestedAliasesMap
): FlatDottedObject {
  const res: FlatDottedObject = {};
  dotifyRecurse(obj, res, aliases);
  return res;
}

/**
 * Nested projection converts to `flat` dotted mongoose projection.
 * If you model has aliases, then pass here result from `prepareNestedAliases()`
 */
function dotifyRecurse(
  obj: Record<string, any>,
  res: FlatDottedObject,
  aliases?: NestedAliasesMap | false,
  prefix?: string
) {
  Object.keys(obj).forEach((key: string) => {
    const value = obj[key];

    let newKey;
    if (aliases && aliases?.[key]) {
      const alias = aliases?.[key];
      let aliasValue;
      if (typeof alias === 'string') {
        aliasValue = alias;
      } else if (isObject(alias)) {
        aliasValue = alias?.__selfAlias;
      }
      newKey = aliasValue || key;
    } else {
      newKey = key;
    }

    if (prefix) {
      newKey = `${prefix}.${newKey}`;
    }

    if (value && (value.$meta || value.$slice || value.$elemMatch || value.$)) {
      // pass MongoDB projection operators https://docs.mongodb.com/v3.2/reference/operator/projection/meta/
      res[newKey] = value;
    } else if (isObject(value) && Object.keys(value).length > 0) {
      let subAliases: NestedAliasesMap | undefined;
      if (aliases && isObject(aliases?.[key])) {
        subAliases = (aliases as any)[key];
      }
      dotifyRecurse(value, res, subAliases, newKey);
    } else {
      // set `true` or `false` for projection
      res[newKey] = !!value;
    }
  });
}
