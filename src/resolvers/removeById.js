/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import findById from './findById';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function removeById(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: GenResolverOpts // eslint-disable-line no-unused-vars
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeById() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver removeById() should be instance of TypeComposer.');
  }

  const findByIdResolver = findById(model, tc);

  const outputTypeName = `RemoveById${tc.getTypeName()}Payload`;
  const outputType = tc.constructor.schemaComposer.getOrCreateTC(outputTypeName, t => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Removed document ID',
      },
      record: {
        type: tc,
        description: 'Removed document',
      },
    });
  });

  const resolver = new tc.constructor.schemaComposer.Resolver({
    name: 'removeById',
    kind: 'mutation',
    description:
      'Remove one document: ' +
      '1) Retrieve one document and remove with hooks via findByIdAndRemove. ' +
      '2) Return removed document.',
    type: outputType,
    args: {
      _id: 'MongoID!',
    },
    resolve: async (resolveParams: ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (!args._id) {
        throw new Error(`${tc.getTypeName()}.removeById resolver requires args._id value`);
      }

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      resolveParams.projection = {};

      let doc = await findByIdResolver.resolve(resolveParams);

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }
      if (doc) {
        await doc.remove();

        return {
          record: doc,
          recordId: tc.getRecordIdFn()(doc),
        };
      }

      return null;
    },
  });

  return resolver;
}
