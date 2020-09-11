import { toInputType } from 'graphql-compose';
import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { projectionHelper, prepareAliases, ArgsMap } from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';
import { getDataLoader } from './helpers/dataLoaderHelper';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataLoaderManyResolverOpts {}

export function dataLoaderMany<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts?: DataLoaderManyResolverOpts
): Resolver<TSource, TContext, ArgsMap, TDoc> {
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

  return tc.schemaComposer.createResolver({
    type: tc.List.NonNull,
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

      const dl = getDataLoader(resolveParams.context, resolveParams.info, (ids) => {
        resolveParams.query = model.find({
          _id: { $in: ids },
        } as any);
        resolveParams.model = model;
        projectionHelper(resolveParams, aliases);
        return beforeQueryHelper(resolveParams) || [];
      });

      return dl.loadMany(args._ids);
    }) as any,
  }) as any;
}
