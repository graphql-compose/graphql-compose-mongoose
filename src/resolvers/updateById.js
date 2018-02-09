/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { recordHelperArgs } from './helpers/record';
import findById from './findById';
import GraphQLMongoID from '../types/mongoid';
import typeStorage from '../typeStorage';

import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function updateById(
  model: MongooseModel,
  typeComposer: TypeComposer,
  opts?: GenResolverOpts
): Resolver<*, *> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateById() should be instance of Mongoose Model.');
  }

  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver updateById() should be instance of TypeComposer.');
  }

  const findByIdResolver = findById(model, typeComposer);

  const outputTypeName = `UpdateById${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    TypeComposer.create({
      name: outputTypeName,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Updated document ID',
        },
        record: {
          type: typeComposer.getType(),
          description: 'Updated document',
        },
      },
    })
  );

  const resolver = new Resolver({
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
      ...recordHelperArgs(typeComposer, {
        recordTypeName: `UpdateById${typeComposer.getTypeName()}Input`,
        requiredFields: ['_id'],
        isRequired: true,
        ...(opts && opts.record),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || {};

      if (!(typeof recordData === 'object')) {
        return Promise.reject(
          new Error(`${typeComposer.getTypeName()}.updateById resolver requires args.record value`)
        );
      }

      if (!recordData._id) {
        return Promise.reject(
          new Error(
            `${typeComposer.getTypeName()}.updateById resolver requires args.record._id value`
          )
        );
      }

      resolveParams.args._id = recordData._id;
      delete recordData._id;

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      resolveParams.projection = {};

      return (
        findByIdResolver
          .resolve(resolveParams)
          .then(doc => {
            if (resolveParams.beforeRecordMutate) {
              return resolveParams.beforeRecordMutate(doc, resolveParams);
            }
            return doc;
          })
          // save changes to DB
          .then(doc => {
            if (!doc) {
              return Promise.reject(new Error('Document not found'));
            }
            if (recordData) {
              doc.set(recordData);
              return doc.save();
            }
            return doc;
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
