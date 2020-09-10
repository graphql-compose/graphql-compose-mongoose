import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { projectionHelper, prepareAliases, ArgsMap } from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';
import { getDataLoader } from './helpers/dataLoaderHelper';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataLoaderResolverOpts {}

export function dataLoader<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts?: DataLoaderResolverOpts
): Resolver<TSource, TContext, ArgsMap, TDoc> {
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
    resolve: ((resolveParams: ExtendedResolveParams<TDoc>) => {
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
        } as any);
        resolveParams.model = model;
        projectionHelper(resolveParams, aliases);
        return beforeQueryHelper(resolveParams) || [];
      });

      return dl.load(args._id);
    }) as any,
  }) as any;
}
