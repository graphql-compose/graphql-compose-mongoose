import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { projectionHelper, prepareAliases, prepareAliasesReverse, replaceAliases } from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelperLean } from './helpers/beforeQueryHelper';
import { getDataLoader } from './helpers/dataLoaderHelper';

export default function dataLoaderManyLean<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver dataLoaderMany() should be instance of Mongoose Model.'
    );
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver dataLoaderMany() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareAliases(model);
  const aliasesReverse = prepareAliasesReverse(model);

  return tc.schemaComposer.createResolver({
    type: tc.NonNull.List.NonNull,
    name: 'dataLoaderManyLean',
    kind: 'query',
    args: {
      _ids: '[MongoID]!',
    },
    resolve: ((resolveParams: ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (!Array.isArray(args._ids) || args._ids.length === 0) {
        return Promise.resolve([]);
      }

      if (!resolveParams.info) {
        throw new Error(
          `Cannot use ${tc.getTypeName()}.dataLoaderManyLean resolver without 'info: GraphQLResolveInfo'`
        );
      }

      const dl = getDataLoader(resolveParams.context, resolveParams.info, async (ids) => {
        resolveParams.query = model.find({
          _id: { $in: ids },
        });
        resolveParams.model = model;
        projectionHelper(resolveParams, aliases);
        const result = (await beforeQueryHelperLean(resolveParams)) || [];
        return Array.isArray(result) && aliasesReverse
          ? result.map((r) => replaceAliases(r, aliasesReverse))
          : result;
      });

      return dl.loadMany(args._ids);
    }) as any,
  }) as any;
}
