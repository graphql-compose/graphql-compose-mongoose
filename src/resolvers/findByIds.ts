import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  limitHelper,
  limitHelperArgs,
  sortHelper,
  sortHelperArgs,
  projectionHelper,
  prepareAliases,
  LimitHelperArgsOpts,
  SortHelperArgsOpts,
} from './helpers';
import type { ExtendedResolveParams } from './';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';

export interface FindByIdsResolverOpts {
  limit?: LimitHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
}

export default function findByIds<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: FindByIdsResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findByIds() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver findByIds() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareAliases(model);

  return tc.schemaComposer.createResolver({
    type: tc.NonNull.List.NonNull,
    name: 'findByIds',
    kind: 'query',
    args: {
      _ids: '[MongoID]!',
      ...limitHelperArgs({
        ...opts?.limit,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindByIds${tc.getTypeName()}Input`,
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
      return beforeQueryHelper(resolveParams) || [];
    }) as any,
  }) as any;
}
