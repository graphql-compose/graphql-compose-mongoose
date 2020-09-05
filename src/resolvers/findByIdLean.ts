import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { projectionHelper, prepareAliases, prepareAliasesReverse } from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelperLean } from './helpers/beforeQueryHelper';

export default function findByIdLean<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>
  // _opts?: GenResolverOpts
): Resolver<TSource, TContext> {
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
    resolve: ((resolveParams: ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (args._id) {
        resolveParams.query = model.findById(args._id); // eslint-disable-line
        resolveParams.model = model; // eslint-disable-line
        projectionHelper(resolveParams, aliases);
        return beforeQueryHelperLean(resolveParams, aliasesReverse);
      }
      return Promise.resolve(null);
    }) as any,
  }) as any;
}
