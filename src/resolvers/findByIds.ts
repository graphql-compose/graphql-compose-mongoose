import { Resolver, ObjectTypeComposer, toInputType } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  limitHelper,
  limitHelperArgs,
  sortHelper,
  sortHelperArgs,
  projectionHelper,
  prepareNestedAliases,
  prepareAliasesReverse,
  replaceAliases,
  LimitHelperArgsOpts,
  SortHelperArgsOpts,
} from './helpers';
import type { ExtendedResolveParams } from './';
import { beforeQueryHelper, beforeQueryHelperLean } from './helpers/beforeQueryHelper';

export interface FindByIdsResolverOpts {
  /**
   * Enabling the lean option tells Mongoose to skip instantiating
   * a full Mongoose document and just give you the plain JavaScript objects.
   * Documents are much heavier than vanilla JavaScript objects,
   * because they have a lot of internal state for change tracking.
   * The downside of enabling lean is that lean docs don't have:
   *   Default values
   *   Getters and setters
   *   Virtuals
   * Read more about `lean`: https://mongoosejs.com/docs/tutorials/lean.html
   */
  lean?: boolean;
  limit?: LimitHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
}

type TArgs = {
  _ids: any;
  limit?: number;
  sort?: string | string[] | Record<string, any>;
};

export function findByIds<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: FindByIdsResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findByIds() should be instance of Mongoose Model.');
  }

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver findByIds() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareNestedAliases(model.schema);
  const aliasesReverse = prepareAliasesReverse(model.schema);

  return tc.schemaComposer.createResolver<TSource, TArgs>({
    type: '[' + tc.getTypeName() + '!]!',
    name: 'findByIds',
    kind: 'query',
    args: {
      _ids: tc.hasField('_id')
        ? toInputType(tc.getFieldTC('_id')).NonNull.List.NonNull
        : '[MongoID!]!',
      ...limitHelperArgs({
        ...opts?.limit,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindByIds${tc.getTypeName()}Input`,
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
      if (opts?.lean) {
        const result = (await beforeQueryHelperLean(resolveParams)) || [];
        return Array.isArray(result) && aliasesReverse
          ? result.map((r) => replaceAliases(r, aliasesReverse))
          : result;
      } else {
        return beforeQueryHelper(resolveParams) || [];
      }
    }) as any,
  });
}
