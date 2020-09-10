import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { recordHelperArgs, RecordHelperArgsOpts, ArgsMap } from './helpers';
import type { ExtendedResolveParams } from './index';
import { addErrorCatcherField } from './helpers/errorCatcher';
import { validateAndThrow } from './helpers/validate';

export interface CreateOneResolverOpts {
  /** Customize input-type for `record` argument. */
  record?: RecordHelperArgsOpts | false;
  /** Customize payload.recordId field. By default: `doc._id`. */
  recordIdFn?: (doc: any, context: any) => any;
}

export function createOne<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: CreateOneResolverOpts
): Resolver<TSource, TContext, ArgsMap, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver createOne() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver createOne() should be instance of ObjectTypeComposer.'
    );
  }

  const tree = model.schema.obj;
  const requiredFields = [];
  for (const field in tree) {
    if (tree.hasOwnProperty(field)) {
      const fieldOptions = tree[field];
      if (fieldOptions.required && typeof fieldOptions.required !== 'function') {
        requiredFields.push(field);
      }
    }
  }

  const outputTypeName = `CreateOne${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Created document ID',
        resolve: (source, _, context) => {
          const doc = source?.record;
          if (!doc) return;
          return opts?.recordIdFn ? opts.recordIdFn(doc, context) : doc?._id;
        },
      },
      record: {
        type: tc,
        description: 'Created document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver({
    name: 'createOne',
    kind: 'mutation',
    description: 'Create one document with mongoose defaults, setters, hooks and validation',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        prefix: 'CreateOne',
        suffix: 'Input',
        removeFields: ['id', '_id'],
        isRequired: true,
        requiredFields,
        ...(opts && opts.record),
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const recordData = resolveParams?.args?.record;

      if (!(typeof recordData === 'object') || Object.keys(recordData).length === 0) {
        throw new Error(
          `${tc.getTypeName()}.createOne resolver requires at least one value in args.record`
        );
      }

      let doc = new model(recordData);
      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
        if (!doc) return null;
      }

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
