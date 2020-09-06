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
  if (result !== undefined) {
    if (typeof result?.exec === 'function') {
      // if `beforeQuery` returns new `query` object
      return result.exec();
    } else {
      // if `beforeQuery` returns data
      return result;
    }
  } else {
    // if `beforeQuery` modifies initial `query` object
    return resolveParams.query.exec();
  }
}

export async function beforeQueryHelperLean(resolveParams: ExtendedResolveParams): Promise<any> {
  if (!resolveParams.query || typeof resolveParams.query.lean !== 'function') {
    throw new Error('beforeQueryHelper: expected resolveParams.query to be instance of Query');
  }

  if (!resolveParams.beforeQuery) {
    return resolveParams.query.lean();
  }

  const result = await resolveParams.beforeQuery(resolveParams.query, resolveParams);
  if (result !== undefined) {
    if (typeof result?.lean === 'function') {
      // if `beforeQuery` returns new `query` object
      return result.lean();
    } else {
      // if `beforeQuery` returns data
      return result;
    }
  } else {
    // if `beforeQuery` modifies initial `query` object
    return resolveParams.query.lean();
  }
}
