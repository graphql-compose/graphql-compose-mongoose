import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  limitHelper,
  limitHelperArgs,
  sortHelper,
  sortHelperArgs,
  projectionHelper,
  prepareAliases,
  prepareAliasesReverse,
} from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { beforeQueryHelperLean } from './helpers/beforeQueryHelper';

export default function findByIdsLean<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findByIdsLean() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver findByIdsLean() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareAliases(model);
  const aliasesReverse = prepareAliasesReverse(model);

  return tc.schemaComposer.createResolver({
    type: tc.NonNull.List.NonNull,
    name: 'findByIdsLean',
    kind: 'query',
    args: {
      _ids: '[MongoID]!',
      ...limitHelperArgs({
        ...opts?.limit,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindByIdsLean${tc.getTypeName()}Input`,
        ...opts?.sort,
      }),
    },
    resolve: ((resolveParams: ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (!Array.isArray(args._ids) || args._ids.length === 0) {
        return Promise.resolve([]);
      }

      const selector = {
        _id: { $in: args._ids },
      };

      resolveParams.query = model.find(selector);
      resolveParams.model = model;
      projectionHelper(resolveParams, aliases);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      return beforeQueryHelperLean(resolveParams, aliasesReverse) || [];
    }) as any,
  }) as any;
}
