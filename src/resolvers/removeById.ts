import { Resolver, ObjectTypeComposer, toInputType } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { findById } from './findById';
import type { ExtendedResolveParams } from './index';
import { addErrorCatcherField } from './helpers/errorCatcher';
import { PayloadRecordIdHelperOpts, payloadRecordId } from './helpers/payloadRecordId';

export interface RemoveByIdResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}

type TArgs = {
  _id: any;
};

export function removeById<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: RemoveByIdResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeById() should be instance of Mongoose Model.');
  }

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver removeById() should be instance of ObjectTypeComposer.'
    );
  }

  const findByIdResolver = findById(model, tc);

  const outputTypeName = `RemoveById${tc.getTypeName()}${opts?.suffix || ''}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.setFields({
      ...payloadRecordId(tc, opts?.recordId),
      record: {
        type: tc.getTypeName(),
        description: 'Removed document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver<TSource, TArgs>({
    name: 'removeById',
    kind: 'mutation',
    description:
      'Remove one document: ' +
      '1) Retrieve one document and remove with hooks via findByIdAndRemove. ' +
      '2) Return removed document.',
    type: outputType,
    args: {
      _id: tc.hasField('_id') ? toInputType(tc.getFieldTC('_id')).NonNull : 'MongoID!',
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

  if (!opts?.disableErrorField) {
    // Add `error` field to payload which can catch resolver Error
    // and return it in mutation payload
    addErrorCatcherField(resolver);
  }

  return resolver;
}
