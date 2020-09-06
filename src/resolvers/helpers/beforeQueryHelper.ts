import type { ExtendedResolveParams } from '../index';

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

export async function beforeQueryHelperLean(resolveParams: ExtendedResolveParams): Promise<any> {
  if (!resolveParams.query || typeof resolveParams.query.lean !== 'function') {
    throw new Error('beforeQueryHelper: expected resolveParams.query to be instance of Query');
  }

  if (!resolveParams.beforeQuery) {
    return resolveParams.query.lean();
  }

  const result = resolveParams.beforeQuery(resolveParams.query, resolveParams);
  if (result && typeof (result as any).lean === 'function') {
    return (result as any).lean();
  }
  return result;
}
