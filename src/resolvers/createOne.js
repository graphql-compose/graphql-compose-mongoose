/* @flow */
/* eslint-disable no-param-reassign, new-cap */

import { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { recordHelperArgs } from './helpers';
import typeStorage from '../typeStorage';
import GraphQLMongoID from '../types/mongoid';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function createOne(
  model: MongooseModel,
  typeComposer: TypeComposer,
  opts?: GenResolverOpts
): Resolver<*, *> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver createOne() should be instance of Mongoose Model.');
  }

  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver createOne() should be instance of TypeComposer.');
  }

  const outputTypeName = `CreateOne${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    TypeComposer.create({
      name: outputTypeName,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Created document ID',
        },
        record: {
          type: typeComposer.getType(),
          description: 'Created document',
        },
      },
    })
  );

  const resolver = new Resolver({
    name: 'createOne',
    kind: 'mutation',
    description: 'Create one document with mongoose defaults, setters, hooks and validation',
    type: outputType,
    args: {
      ...recordHelperArgs(typeComposer, {
        recordTypeName: `CreateOne${typeComposer.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        ...(opts && opts.record),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || {};

      if (!(typeof recordData === 'object') || Object.keys(recordData).length === 0) {
        return Promise.reject(
          new Error(
            `${typeComposer.getTypeName()}.createOne resolver requires ` +
              'at least one value in args.record'
          )
        );
      }

      return Promise.resolve(new model(recordData))
        .then(doc => {
          if (resolveParams.beforeRecordMutate) {
            return resolveParams.beforeRecordMutate(doc, resolveParams);
          }
          return doc;
        })
        .then(doc => doc.save())
        .then(record => {
          if (record) {
            return {
              record,
              recordId: typeComposer.getRecordIdFn()(record),
            };
          }

          return null;
        });
    },
  });

  return resolver;
}
