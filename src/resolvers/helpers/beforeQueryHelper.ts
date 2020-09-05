import type { ExtendedResolveParams } from '../index';
import { AliasesMap, replaceAliases } from './aliases';

export interface BeforeQueryHelperOpts {
  useLean?: boolean;
}

export async function beforeQueryHelper(resolveParams: ExtendedResolveParams): Promise<any> {
  if (!resolveParams.query || typeof resolveParams.query.exec !== 'function') {
    throw new Error('beforeQueryHelper: expected resolveParams.query to be instance of Query');
  }
  if (!resolveParams.beforeQuery) {
    return resolveParams.query.exec();
  }

  const result = await resolveParams.beforeQuery(resolveParams.query, resolveParams);
  if (result && typeof result.exec === 'function') {
    return result.exec();
  }
  return result;
}

export async function beforeQueryHelperLean(
  resolveParams: ExtendedResolveParams,
  reverseAliases: AliasesMap | false
): Promise<any> {
  if (!resolveParams.query || typeof resolveParams.query.lean !== 'function') {
    throw new Error('beforeQueryHelper: expected resolveParams.query to be instance of Query');
  }

  let result;
  if (!resolveParams.beforeQuery) {
    result = await resolveParams.query.lean();
  } else {
    result = resolveParams.beforeQuery(resolveParams.query, resolveParams);
    if (result && typeof (result as any).lean === 'function') {
      result = await (result as any).lean();
    }
  }

  if (reverseAliases && result) {
    // translate field aliases to match GraphQL field type
    if (Array.isArray(result)) {
      return result.map((d) => replaceAliases(d, reverseAliases));
    } else {
      return replaceAliases(result, reverseAliases);
    }
  } else {
    return result;
  }
}
