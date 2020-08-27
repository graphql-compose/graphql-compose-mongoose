import type { ObjectTypeComposer, Resolver } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { recordHelperArgs } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { addErrorCatcherField } from './helpers/addErrorCatcherField';
import { ValidationError } from '../errors';

async function createSingle(
  model: Model<any>,
  recordData: any,
  resolveParams: ExtendedResolveParams,
  idx: number
) {
  // eslint-disable-next-line new-cap
  let doc = new model(recordData);
  if (resolveParams.beforeRecordMutate) {
    doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
    if (!doc) return null;
  }

  const validationErrors = await new Promise((resolve) => {
    doc.validate(resolve);
  });
  if (validationErrors) {
    throw new ValidationError(validationErrors as any, { pathPrefix: `${idx}.` });
  }

  return doc.save();
}

export default function createMany<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext, any> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver createMany() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
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

  const outputTypeName = `CreateMany${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      recordIds: {
        type: '[MongoID!]!',
        description: 'Created document ID',
      },
      records: {
        type: tc.NonNull.List,
        description: 'Created documents',
      },
      createCount: {
        type: 'Int!',
        description: 'Count of all documents created',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver({
    name: 'createMany',
    kind: 'mutation',
    description: 'Creates Many documents with mongoose defaults, setters, hooks and validation',
    type: outputType,
    args: {
      records: {
        type: (recordHelperArgs(tc, {
          prefix: 'CreateMany',
          suffix: 'Input',
          removeFields: ['id', '_id'],
          isRequired: true,
          requiredFields,
          ...(opts && opts.records),
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

      const recordPromises = [];
      // concurrently create docs
      for (let i = 0; i < recordData.length; i++) {
        recordPromises.push(
          createSingle(model, recordData[i], resolveParams as ExtendedResolveParams, i)
        );
      }

      const results = await Promise.all(recordPromises);
      const returnObj = {
        records: [] as any[],
        recordIds: [] as any[],
        createCount: 0,
      };

      for (const doc of results) {
        if (doc) {
          returnObj.createCount += 1;
          returnObj.records.push(doc);
          returnObj.recordIds.push(doc._id);
        }
      }

      return returnObj;
    },
  });

  // Add `error` field to payload which can catch resolver Error
  // and return it in mutation payload
  addErrorCatcherField(resolver);

  return resolver;
}
