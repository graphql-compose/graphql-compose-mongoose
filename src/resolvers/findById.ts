import { toInputType } from 'graphql-compose';
import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { projectionHelper, prepareAliases } from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FindByIdResolverOpts {}

type TArgs = {
  _id: any;
};

export function findById<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts?: FindByIdResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findById() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('Second arg for Resolver findById() should be instance of ObjectTypeComposer.');
  }

  const aliases = prepareAliases(model);

  return tc.schemaComposer.createResolver<TSource, TArgs>({
    type: tc,
    name: 'findById',
    kind: 'query',
    args: {
      _id: tc.hasField('_id') ? toInputType(tc.getFieldTC('_id')).NonNull : 'MongoID',
    },
    resolve: ((resolveParams: ExtendedResolveParams<TDoc>) => {
      const args = resolveParams.args || {};

      if (args._id) {
        resolveParams.query = model.findById(args._id);
        resolveParams.model = model;
        projectionHelper(resolveParams, aliases);
        return beforeQueryHelper(resolveParams);
      }
      return Promise.resolve(null);
    }) as any,
  });
}
