import type { ExtendedResolveParams } from '../index';

export async function beforeQueryHelper(resolveParams: ExtendedResolveParams): Promise<any> {
  if (!resolveParams.beforeQuery) {
    return resolveParams.query.exec();
  }

  if (!resolveParams.query || typeof resolveParams.query.exec !== 'function') {
    throw new Error('beforeQueryHelper: expected resolveParams.query to be intance of Query');
  }

  if (!resolveParams.model || !resolveParams.model.modelName || !resolveParams.model.schema) {
    throw new Error('beforeQueryHelper: resolveParams.model should be instance of Mongoose Model.');
  }

  const result = await resolveParams.beforeQuery(resolveParams.query, resolveParams);

  if (result && typeof result.exec === 'function') {
    return result.exec();
  }

  return result;
}
