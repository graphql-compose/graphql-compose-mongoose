import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { recordHelperArgs, RecordHelperArgsOpts } from './helpers/record';
import findById from './findById';
import { addErrorCatcherField } from './helpers/errorCatcher';
import type { ExtendedResolveParams } from './index';
import { validateAndThrow } from './helpers/validate';
import { ArgsMap } from './helpers';

export interface UpdateByIdResolverOpts {
  /** Customize input-type for `record` argument. */
  record?: RecordHelperArgsOpts | false;
  /** Customize payload.recordId field. By default: `doc._id`. */
  recordIdFn?: (doc: any, context: any) => any;
}

export default function updateById<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: UpdateByIdResolverOpts
): Resolver<TSource, TContext, ArgsMap, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateById() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver updateById() should be instance of ObjectTypeComposer.'
    );
  }

  const findByIdResolver = findById(model, tc);

  const outputTypeName = `UpdateById${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Updated document ID',
        resolve: (source, _, context) => {
          const doc = source?.record;
          if (!doc) return;
          return opts?.recordIdFn ? opts.recordIdFn(doc, context) : doc?._id;
        },
      },
      record: {
        type: tc,
        description: 'Updated document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver({
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
      _id: 'MongoID!',
      ...recordHelperArgs(tc, {
        removeFields: ['_id'], // pull out `_id` to top-level
        prefix: 'UpdateById',
        suffix: 'Input',
        isRequired: true,
        allFieldsNullable: true,
        ...(opts && opts.record),
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

  // Add `error` field to payload which can catch resolver Error
  // and return it in mutation payload
  addErrorCatcherField(resolver);

  return resolver as any;
}
