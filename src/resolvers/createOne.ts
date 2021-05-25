import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { recordHelperArgs, RecordHelperArgsOpts } from './helpers';
import type { ExtendedResolveParams } from './index';
import { addErrorCatcherField } from './helpers/errorCatcher';
import { validateAndThrow } from './helpers/validate';
import { PayloadRecordIdHelperOpts, payloadRecordId } from './helpers/payloadRecordId';

export interface CreateOneResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `record` argument */
  record?: RecordHelperArgsOpts;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}

type TArgs = {
  record: Record<string, any>;
};

export function createOne<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: CreateOneResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver createOne() should be instance of Mongoose Model.');
  }

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
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

  const outputTypeName = `CreateOne${tc.getTypeName()}${opts?.suffix || ''}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.setFields({
      ...payloadRecordId(tc, opts?.recordId),
      record: {
        type: tc.getTypeName(),
        description: 'Created document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver<TSource, TArgs>({
    name: `createOne${opts?.suffix || ''}`,
    kind: 'mutation',
    description: 'Create one document with mongoose defaults, setters, hooks and validation',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        prefix: 'CreateOne',
        suffix: `${opts?.suffix || ''}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        requiredFields,
        ...opts?.record,
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

  if (!opts?.disableErrorField) {
    // Add `error` field to payload which can catch resolver Error
    // and return it in mutation payload
    addErrorCatcherField(resolver);
  }

  return resolver;
}
