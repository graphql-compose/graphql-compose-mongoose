import { ObjectTypeComposer, Resolver } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { recordHelperArgs, RecordHelperArgsOpts } from './helpers';
import { addErrorCatcherField } from './helpers/errorCatcher';
import { validateManyAndThrow } from './helpers/validate';
import { payloadRecordIds, PayloadRecordIdsHelperOpts } from './helpers/payloadRecordId';

export interface CreateManyResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `records` argument. */
  records?: RecordHelperArgsOpts;
  /** Customize payload.recordIds field. If false, then this field will be removed. */
  recordIds?: PayloadRecordIdsHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}

type TArgs = {
  records: any[];
};

export function createMany<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: CreateManyResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver createMany() should be instance of Mongoose Model.');
  }

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver createMany() should be instance of ObjectTypeComposer.'
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

  const outputTypeName = `CreateMany${tc.getTypeName()}${opts?.suffix || ''}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.setFields({
      ...payloadRecordIds(tc, opts?.recordIds),
      records: {
        type: tc.NonNull.List,
        description: 'Created documents',
      },
      createdCount: {
        type: 'Int!',
        description: 'Number of created documents',
        resolve: (s: any) => s.createdCount || 0,
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver<TSource, TArgs>({
    name: 'createMany',
    kind: 'mutation',
    description: 'Creates Many documents with mongoose defaults, setters, hooks and validation',
    type: outputType,
    args: {
      records: {
        type: (recordHelperArgs(tc, {
          prefix: 'CreateMany',
          suffix: `${opts?.suffix || ''}Input`,
          removeFields: ['id', '_id'],
          isRequired: true,
          requiredFields,
          ...opts?.records,
        }) as any).record.type.List.NonNull,
      },
    },
    resolve: async (resolveParams) => {
      const recordData = resolveParams?.args?.records;

      if (!Array.isArray(recordData) || recordData.length === 0) {
        throw new Error(
          `${tc.getTypeName()}.createMany resolver requires args.records to be an Array and must contain at least one record`
        );
      }

      for (const record of recordData) {
        if (!(typeof record === 'object') || Object.keys(record).length === 0) {
          throw new Error(
            `${tc.getTypeName()}.createMany resolver requires args.records to contain non-empty records, with at least one value`
          );
        }
      }

      const docs = [] as TDoc[];
      for (const record of recordData) {
        // eslint-disable-next-line new-cap
        let doc = new model(record);
        if (resolveParams.beforeRecordMutate) {
          doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
        }
        docs.push(doc);
      }

      await validateManyAndThrow(docs);
      await model.create(docs as any, { validateBeforeSave: false });

      return {
        records: docs,
        createdCount: docs.length,
      };
    },
  });

  if (!opts?.disableErrorField) {
    // Add `error` field to payload which can catch resolver Error
    // and return it in mutation payload
    addErrorCatcherField(resolver);
  }

  return resolver;
}
