/* @flow */
/* eslint-disable no-param-reassign, new-cap */

import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { MongooseDocument } from 'mongoose';
import { getOrCreateErrorPayload } from '../utils/getOrCreateErrorPayload';
import { recordHelperArgs } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function createOne<TSource: MongooseDocument, TContext>(
  model: Class<TSource>, // === MongooseModel
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
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

  getOrCreateErrorPayload(tc);

  const outputTypeName = `CreateOne${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Created document ID',
      },
      record: {
        type: tc,
        description: 'Created document',
      },
      errors: {
        type: '[ErrorPayload]',
        description: 'Errors that may occur, typically validations',
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
        recordTypeName: `CreateOne${tc.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        requiredFields,
        ...(opts && opts.record),
      }),
    },
    resolve: async (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || {};

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

      const validationErrors = doc.validateSync();
      let errors = null;
      if (validationErrors && validationErrors.errors) {
        errors = [];
        Object.keys(validationErrors.errors).forEach((key) => {
          errors.push({
            path: key,
            messages: [validationErrors.errors[key].properties.message],
          });
        });
        return {
          record: null,
          recordId: null,
          errors,
        };
      } else {
        await doc.save();
        return {
          record: doc,
          recordId: tc.getRecordIdFn()(doc),
          errors,
        };
      }
    },
  });

  return resolver;
}
