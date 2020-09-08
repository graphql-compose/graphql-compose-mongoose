import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { projectionHelper, prepareAliases } from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';
import { getDataLoader } from './helpers/dataLoaderHelper';

export default function dataLoader<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver dataLoader() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver dataLoader() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareAliases(model);

  return tc.schemaComposer.createResolver({
    type: tc,
    name: 'dataLoader',
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
          `Cannot use ${tc.getTypeName()}.dataLoader resolver without 'info: GraphQLResolveInfo'`
        );
      }

      const dl = getDataLoader(resolveParams.context, resolveParams.info, (ids) => {
        resolveParams.query = model.find({
          _id: { $in: ids },
        });
        resolveParams.model = model;
        projectionHelper(resolveParams, aliases);
        return beforeQueryHelper(resolveParams) || [];
      });

      return dl.load(args._id);
    }) as any,
  }) as any;
}
