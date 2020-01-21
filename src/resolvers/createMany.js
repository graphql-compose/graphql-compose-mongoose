/* @flow */

import type { ObjectTypeComposer, Resolver } from 'graphql-compose';
import type { MongooseModel, MongooseDocument } from 'mongoose';
import { recordHelperArgs } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

async function createSingle(
  model: MongooseModel,
  tc: ObjectTypeComposer<any, any>,
  recordData: any,
  resolveParams: ExtendedResolveParams
) {
  // eslint-disable-next-line new-cap
  let doc = new model(recordData);
  if (resolveParams.beforeRecordMutate) {
    doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
    if (!doc) return null;
  }

  return doc.save();
}

export default function createMany<TSource: MongooseDocument, TContext>(
  model: Class<TSource>, // === MongooseModel
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
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
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, t => {
    t.addFields({
      recordIds: {
        type: '[MongoID]!',
        description: 'Created document ID',
      },
      records: {
        type: tc.getTypePlural().getTypeNonNull(),
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
          recordTypeName: `CreateMany${tc.getTypeName()}Input`,
          removeFields: ['id', '_id'],
          isRequired: true,
          requiredFields,
          ...(opts && opts.records),
        }).record: any).type
          .getTypePlural()
          .getTypeNonNull(),
      },
    },
    resolve: async (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.records) || [];

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
      for (const record of recordData) {
        recordPromises.push(createSingle(model, tc, record, resolveParams));
      }

      const results = await Promise.all(recordPromises);
      const returnObj = {
        records: [],
        recordIds: [],
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

  return resolver;
}
