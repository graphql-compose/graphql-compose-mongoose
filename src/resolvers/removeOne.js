/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import GraphQLMongoID from '../types/mongoid';
import typeStorage from '../typeStorage';
import { filterHelperArgs, sortHelperArgs } from './helpers';
import findOne from './findOne';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function removeOne(
  model: MongooseModel,
  typeComposer: TypeComposer,
  opts?: GenResolverOpts
): Resolver<*, *> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeOne() should be instance of Mongoose Model.');
  }

  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver removeOne() should be instance of TypeComposer.');
  }

  const findOneResolver = findOne(model, typeComposer, opts);

  const outputTypeName = `RemoveOne${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    TypeComposer.create({
      name: outputTypeName,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Removed document ID',
        },
        record: {
          type: typeComposer.getType(),
          description: 'Removed document',
        },
      },
    })
  );

  const resolver = new Resolver({
    name: 'removeOne',
    kind: 'mutation',
    description:
      'Remove one document: ' +
      '1) Remove with hooks via findOneAndRemove. ' +
      '2) Return removed document.',
    type: outputType,
    args: {
      ...filterHelperArgs(typeComposer, model, {
        filterTypeName: `FilterRemoveOne${typeComposer.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortRemoveOne${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const filterData = (resolveParams.args && resolveParams.args.filter) || {};

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        return Promise.reject(
          new Error(
            `${typeComposer.getTypeName()}.removeOne resolver requires ` +
              'at least one value in args.filter'
          )
        );
      }

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      resolveParams.projection = {};

      return (
        findOneResolver
          .resolve(resolveParams)
          .then(doc => {
            if (resolveParams.beforeRecordMutate) {
              return resolveParams.beforeRecordMutate(doc, resolveParams);
            }
            return doc;
          })
          // remove record from DB
          .then(doc => {
            if (!doc) {
              return Promise.reject(new Error('Document not found'));
            }
            return doc.remove();
          })
          // prepare output payload
          .then(record => {
            if (record) {
              return {
                record,
                recordId: typeComposer.getRecordIdFn()(record),
              };
            }

            return null;
          })
      );
    },
  });

  return resolver;
}
