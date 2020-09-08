import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  projectionHelper,
  prepareAliases,
  prepareAliasesReverse,
  replaceAliases,
  ArgsMap,
} from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelperLean } from './helpers/beforeQueryHelper';

export default function findByIdLean<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>
): Resolver<TSource, TContext, ArgsMap, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findByIdLean() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver findByIdLean() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareAliases(model);
  const aliasesReverse = prepareAliasesReverse(model);

  return tc.schemaComposer.createResolver({
    type: tc,
    name: 'findByIdLean',
    kind: 'query',
    args: {
      _id: 'MongoID!',
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const args = resolveParams.args || {};

      if (args._id) {
        resolveParams.query = model.findById(args._id);
        resolveParams.model = model;
        projectionHelper(resolveParams, aliases);
        const result = await beforeQueryHelperLean(resolveParams);
        return result && aliasesReverse ? replaceAliases(result, aliasesReverse) : result;
      }
      return Promise.resolve(null);
    }) as any,
  }) as any;
}
