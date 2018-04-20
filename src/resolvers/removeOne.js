/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { filterHelperArgs, sortHelperArgs } from './helpers';
import findOne from './findOne';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function removeOne(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: GenResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeOne() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver removeOne() should be instance of TypeComposer.');
  }

  const findOneResolver = findOne(model, tc, opts);

  const outputTypeName = `RemoveOne${tc.getTypeName()}Payload`;
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
    name: 'removeOne',
    kind: 'mutation',
    description:
      'Remove one document: ' +
      '1) Remove with hooks via findOneAndRemove. ' +
      '2) Return removed document.',
    type: outputType,
    args: {
      ...filterHelperArgs(tc, model, {
        filterTypeName: `FilterRemoveOne${tc.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortRemoveOne${tc.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: async (resolveParams: ExtendedResolveParams) => {
      const filterData = (resolveParams.args && resolveParams.args.filter) || {};

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        return Promise.reject(
          new Error(
            `${tc.getTypeName()}.removeOne resolver requires at least one value in args.filter`
          )
        );
      }

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      resolveParams.projection = {};

      let doc = await findOneResolver.resolve(resolveParams);

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
