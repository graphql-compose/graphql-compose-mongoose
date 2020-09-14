import { toInputType } from 'graphql-compose';
import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { projectionHelper, prepareAliases, prepareAliasesReverse, replaceAliases } from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper, beforeQueryHelperLean } from './helpers/beforeQueryHelper';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FindByIdResolverOpts {
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
  _id: any;
};

export function findById<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: FindByIdResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findById() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('Second arg for Resolver findById() should be instance of ObjectTypeComposer.');
  }

  const aliases = prepareAliases(model);
  const aliasesReverse = prepareAliasesReverse(model);

  return tc.schemaComposer.createResolver<TSource, TArgs>({
    type: tc,
    name: 'findById',
    kind: 'query',
    args: {
      _id: tc.hasField('_id') ? toInputType(tc.getFieldTC('_id')).NonNull : 'MongoID',
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const args = resolveParams.args || {};

      if (args._id) {
        resolveParams.query = model.findById(args._id);
        resolveParams.model = model;
        projectionHelper(resolveParams, aliases);
        if (opts?.lean) {
          const result = await beforeQueryHelperLean(resolveParams);
          return result && aliasesReverse ? replaceAliases(result, aliasesReverse) : result;
        } else {
          return beforeQueryHelper(resolveParams);
        }
      }
      return Promise.resolve(null);
    }) as any,
  });
}
