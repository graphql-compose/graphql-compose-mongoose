/* @flow */
/* eslint-disable no-param-reassign, new-cap */

import type { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { recordHelperArgs } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function createOne(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: GenResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver createOne() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver createOne() should be instance of TypeComposer.');
  }

  const outputTypeName = `CreateOne${tc.getTypeName()}Payload`;
  const outputType = tc.constructor.schemaComposer.getOrCreateTC(outputTypeName, t => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Created document ID',
      },
      record: {
        type: tc,
        description: 'Created document',
      },
    });
  });

  const resolver = new tc.constructor.schemaComposer.Resolver({
    name: 'createOne',
    kind: 'mutation',
    description: 'Create one document with mongoose defaults, setters, hooks and validation',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        recordTypeName: `CreateOne${tc.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
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
      await doc.save();

      return {
        record: doc,
        recordId: tc.getRecordIdFn()(doc),
      };
    },
  });

  return resolver;
}
