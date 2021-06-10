import { Resolver, ObjectTypeComposer, toInputType } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  projectionHelper,
  prepareNestedAliases,
  prepareAliasesReverse,
  replaceAliases,
} from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper, beforeQueryHelperLean } from './helpers/beforeQueryHelper';
import { getDataLoader } from './helpers/dataLoaderHelper';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataLoaderManyResolverOpts {
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
}

type TArgs = {
  _ids: any;
};

export function dataLoaderMany<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: DataLoaderManyResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver dataLoaderMany() should be instance of Mongoose Model.'
    );
  }

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver dataLoaderMany() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareNestedAliases(model.schema);
  const aliasesReverse = prepareAliasesReverse(model.schema);

  return tc.schemaComposer.createResolver<TSource, TArgs>({
    type: '[' + tc.getTypeName() + ']!',
    name: 'dataLoaderMany',
    kind: 'query',
    args: {
      _ids: tc.hasField('_id')
        ? toInputType(tc.getFieldTC('_id')).NonNull.List.NonNull
        : '[MongoID!]!',
    },
    resolve: ((resolveParams: ExtendedResolveParams<TDoc>) => {
      const args = resolveParams.args || {};

      if (!Array.isArray(args._ids) || args._ids.length === 0) {
        return Promise.resolve([]);
      }

      if (!resolveParams.info) {
        throw new Error(
          `Cannot use ${tc.getTypeName()}.dataLoaderMany resolver without 'info: GraphQLResolveInfo'`
        );
      }

      const dl = getDataLoader(resolveParams.context, resolveParams.info, async (ids) => {
        resolveParams.query = model.find({
          _id: { $in: ids },
        } as any);
        resolveParams.model = model;
        projectionHelper(resolveParams, aliases);

        if (opts?.lean) {
          const result = (await beforeQueryHelperLean(resolveParams)) || [];
          return Array.isArray(result) && aliasesReverse
            ? result.map((r) => replaceAliases(r, aliasesReverse))
            : result;
        } else {
          return beforeQueryHelper(resolveParams) || [];
        }
      });

      return dl.loadMany(args._ids);
    }) as any,
  });
}
