/* @flow */
/* eslint-disable no-param-reassign */

import { GraphQLObjectType } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { recordHelperArgs } from './helpers/record';
import findById from './findById';
import GraphQLMongoID from '../types/mongoid';
import typeStorage from '../typeStorage';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function updateById(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver updateById() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error(
      'Second arg for Resolver updateById() should be instance of TypeComposer.'
    );
  }

  const findByIdResolver = findById(model, typeComposer);

  const outputTypeName = `UpdateById${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    new GraphQLObjectType({
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
    description: 'Update one document: '
               + '1) Retrieve one document by findById. '
               + '2) Apply updates to mongoose document. '
               + '3) Mongoose applies defaults, setters, hooks and validation. '
               + '4) And save it.',
    outputType,
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
      resolveParams.projection =
        (resolveParams.projection && resolveParams.projection.record) || {};

      return findByIdResolver.resolve(resolveParams)
        .then(doc => {
          if (resolveParams.beforeRecordMutate) {
            return resolveParams.beforeRecordMutate(doc);
          }
          return doc;
        })
        // save changes to DB
        .then(doc => {
          if (!doc) {
            return Promise.reject('Document not found');
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
        });
    },
  });

  return resolver;
}
