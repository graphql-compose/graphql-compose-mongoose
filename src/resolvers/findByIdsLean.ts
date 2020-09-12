import { toInputType } from 'graphql-compose';
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
  replaceAliases,
  LimitHelperArgsOpts,
  SortHelperArgsOpts,
} from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelperLean } from './helpers/beforeQueryHelper';

export interface FindByIdsLeanResolverOpts {
  limit?: LimitHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
}

type TArgs = {
  _ids: any;
  limit?: number;
  sort?: Record<string, any>;
};

export function findByIdsLean<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: FindByIdsLeanResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
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

  return tc.schemaComposer.createResolver<TSource, TArgs>({
    type: tc.NonNull.List.NonNull,
    name: 'findByIdsLean',
    kind: 'query',
    args: {
      _ids: tc.hasField('_id')
        ? toInputType(tc.getFieldTC('_id')).NonNull.List.NonNull
        : '[MongoID!]!',
      ...limitHelperArgs({
        ...opts?.limit,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindByIdsLean${tc.getTypeName()}Input`,
        ...opts?.sort,
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const args = resolveParams.args || {};

      if (!Array.isArray(args._ids) || args._ids.length === 0) {
        return Promise.resolve([]);
      }

      resolveParams.query = model.find({
        _id: { $in: args._ids },
      } as any);
      resolveParams.model = model;
      projectionHelper(resolveParams, aliases);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      const result = (await beforeQueryHelperLean(resolveParams)) || [];
      return Array.isArray(result) && aliasesReverse
        ? result.map((r) => replaceAliases(r, aliasesReverse))
        : result;
    }) as any,
  });
}
