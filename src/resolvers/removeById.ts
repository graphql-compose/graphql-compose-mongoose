import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import findById from './findById';
import type { ExtendedResolveParams } from './index';
import { addErrorCatcherField } from './helpers/errorCatcher';

export default function removeById<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>
  // _opts?: GenResolverOpts
): Resolver<TSource, TContext> {
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
    resolve: (async (resolveParams: ExtendedResolveParams) => {
      const _id = resolveParams?.args?._id;

      if (!_id) {
        throw new Error(`${tc.getTypeName()}.removeById resolver requires args._id value`);
      }

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      let doc: Document = await findByIdResolver.resolve({ ...resolveParams, projection: {} });

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }
      if (doc) {
        await doc.remove();

        return {
          record: doc,
          recordId: tc.getRecordIdFn()(doc as any),
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
