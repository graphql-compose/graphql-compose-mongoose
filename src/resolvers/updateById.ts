import { Resolver, ObjectTypeComposer, toInputType } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { recordHelperArgs, RecordHelperArgsOpts } from './helpers/record';
import { findById } from './findById';
import { addErrorCatcherField } from './helpers/errorCatcher';
import type { ExtendedResolveParams } from './index';
import { validateAndThrow } from './helpers/validate';
import { PayloadRecordIdHelperOpts, payloadRecordId } from './helpers/payloadRecordId';

export interface UpdateByIdResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `record` argument. */
  record?: RecordHelperArgsOpts;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}

type TArgs = {
  _id: any;
  record: any;
};

export function updateById<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: UpdateByIdResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateById() should be instance of Mongoose Model.');
  }

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver updateById() should be instance of ObjectTypeComposer.'
    );
  }

  const findByIdResolver = findById(model, tc);

  const outputTypeName = `UpdateById${tc.getTypeName()}${opts?.suffix || ''}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.setFields({
      ...payloadRecordId(tc, opts?.recordId),
      record: {
        type: tc.getTypeName(),
        description: 'Updated document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver<TSource, TArgs>({
    name: 'updateById',
    kind: 'mutation',
    description:
      'Update one document: ' +
      '1) Retrieve one document by findById. ' +
      '2) Apply updates to mongoose document. ' +
      '3) Mongoose applies defaults, setters, hooks and validation. ' +
      '4) And save it.',
    type: outputType,
    args: {
      _id: tc.hasField('_id') ? toInputType(tc.getFieldTC('_id')).NonNull : 'MongoID!',
      ...recordHelperArgs(tc, {
        removeFields: ['_id', 'id'], // pull out `_id` to top-level
        prefix: 'UpdateById',
        suffix: `${opts?.suffix || ''}Input`,
        isRequired: true,
        allFieldsNullable: true,
        ...opts?.record,
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const recordData = resolveParams?.args?.record;

      if (!(typeof recordData === 'object')) {
        return Promise.reject(
          new Error(`${tc.getTypeName()}.updateById resolver requires args.record value`)
        );
      }

      if (!resolveParams?.args?._id) {
        return Promise.reject(
          new Error(`${tc.getTypeName()}.updateById resolver requires args._id value`)
        );
      }

      delete recordData._id;

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      let doc: TDoc = await findByIdResolver.resolve({ ...resolveParams, projection: {} });

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }

      if (!doc) {
        throw new Error('Document not found');
      }

      if (!recordData) {
        throw new Error(
          `${tc.getTypeName()}.updateById resolver doesn't receive new data in args.record`
        );
      }

      doc.set(recordData);
      await validateAndThrow(doc);
      await doc.save({ validateBeforeSave: false });

      return {
        record: doc,
      };
    }) as any,
  });

  if (!opts?.disableErrorField) {
    // Add `error` field to payload which can catch resolver Error
    // and return it in mutation payload
    addErrorCatcherField(resolver);
  }

  return resolver;
}
