import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { findById } from './findById';
import type { ExtendedResolveParams } from './index';
import { addErrorCatcherField } from './helpers/errorCatcher';
import { ArgsMap } from './helpers';

export interface RemoveByIdResolverOpts {
  /** Customize payload.recordId field. By default: `doc._id`. */
  recordIdFn?: (doc: any, context: any) => any;
}

export function removeById<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: RemoveByIdResolverOpts
): Resolver<TSource, TContext, ArgsMap, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeById() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver removeById() should be instance of ObjectTypeComposer.'
    );
  }

  const findByIdResolver = findById(model, tc);

  const outputTypeName = `RemoveById${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Removed document ID',
        resolve: (source, _, context) => {
          const doc = source?.record;
          if (!doc) return;
          return opts?.recordIdFn ? opts.recordIdFn(doc, context) : doc?._id;
        },
      },
      record: {
        type: tc,
        description: 'Removed document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver({
    name: 'removeById',
    kind: 'mutation',
    description:
      'Remove one document: ' +
      '1) Retrieve one document and remove with hooks via findByIdAndRemove. ' +
      '2) Return removed document.',
    type: outputType,
    args: {
      _id: 'MongoID!',
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const _id = resolveParams?.args?._id;

      if (!_id) {
        throw new Error(`${tc.getTypeName()}.removeById resolver requires args._id value`);
      }

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      let doc: TDoc = await findByIdResolver.resolve({ ...resolveParams, projection: {} });

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }
      if (doc) {
        await doc.remove();

        return {
          record: doc,
        };
      }

      return null;
    }) as any,
  });

  // Add `error` field to payload which can catch resolver Error
  // and return it in mutation payload
  addErrorCatcherField(resolver);

  return resolver as any;
}
