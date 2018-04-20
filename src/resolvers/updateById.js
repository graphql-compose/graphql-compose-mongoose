/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { recordHelperArgs } from './helpers/record';
import findById from './findById';

import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function updateById(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: GenResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateById() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver updateById() should be instance of TypeComposer.');
  }

  const findByIdResolver = findById(model, tc);

  const outputTypeName = `UpdateById${tc.getTypeName()}Payload`;
  const outputType = tc.constructor.schemaComposer.getOrCreateTC(outputTypeName, t => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Updated document ID',
      },
      record: {
        type: tc.getType(),
        description: 'Updated document',
      },
    });
  });

  const resolver = new tc.constructor.schemaComposer.Resolver({
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
      ...recordHelperArgs(tc, {
        recordTypeName: `UpdateById${tc.getTypeName()}Input`,
        requiredFields: ['_id'],
        isRequired: true,
        ...(opts && opts.record),
      }),
    },
    resolve: async (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || {};

      if (!(typeof recordData === 'object')) {
        return Promise.reject(
          new Error(`${tc.getTypeName()}.updateById resolver requires args.record value`)
        );
      }

      if (!recordData._id) {
        return Promise.reject(
          new Error(`${tc.getTypeName()}.updateById resolver requires args.record._id value`)
        );
      }

      resolveParams.args._id = recordData._id;
      delete recordData._id;

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      resolveParams.projection = {};

      let doc = await findByIdResolver.resolve(resolveParams);

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }

      if (!doc) {
        throw new Error('Document not found');
      }

      if (recordData) {
        doc.set(recordData);
        await doc.save();
      }

      return {
        record: doc,
        recordId: tc.getRecordIdFn()(doc),
      };
    },
  });

  return resolver;
}
