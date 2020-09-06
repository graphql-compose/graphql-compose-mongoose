import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { projectionHelper, prepareAliases, prepareAliasesReverse, replaceAliases } from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelperLean } from './helpers/beforeQueryHelper';
import { getDataLoader } from './helpers/dataLoaderHelper';

export default function dataLoaderLean<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>
  // _opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver dataLoaderLean() should be instance of Mongoose Model.'
    );
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver dataLoaderLean() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareAliases(model);
  const aliasesReverse = prepareAliasesReverse(model);

  return tc.schemaComposer.createResolver({
    type: tc,
    name: 'dataLoaderLean',
    kind: 'query',
    args: {
      _id: 'MongoID!',
    },
    resolve: ((resolveParams: ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (!args._id) {
        return Promise.resolve(null);
      }

      if (!resolveParams.info) {
        throw new Error(
          `Cannot use ${tc.getTypeName()}.dataLoaderLean resolver without 'info: GraphQLResolveInfo'`
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

      return dl.load(args._id);
    }) as any,
  }) as any;
}
