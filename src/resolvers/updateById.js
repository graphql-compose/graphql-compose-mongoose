/* @flow */
/* eslint-disable no-param-reassign */

import { inputHelperArgs } from './helpers/input';
import findById from './findById';
import { GraphQLObjectType } from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import { Resolver, TypeComposer } from 'graphql-compose';

export default function updateById(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts,
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

  const resolver = new Resolver({
    name: 'updateById',
    kind: 'mutation',
    description: 'Update one document: '
               + '1) Retrieve one document by findById. '
               + '2) Apply updates to mongoose document. '
               + '3) Mongoose applies defaults, setters, hooks and validation. '
               + '4) And save it.',
    outputType: new GraphQLObjectType({
      name: `UpdateById${typeComposer.getTypeName()}Payload`,
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
    }),
    args: {
      ...inputHelperArgs(typeComposer, {
        inputTypeName: `UpdateById${typeComposer.getTypeName()}Input`,
        requiredFields: ['_id'],
        isRequired: true,
        ...(opts && opts.input),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const inputData = resolveParams.args && resolveParams.args.input || {};

      if (!(typeof inputData === 'object')) {
        return Promise.reject(
          new Error(`${typeComposer.getTypeName()}.updateById resolver requires args.input value`)
        );
      }

      if (!inputData._id) {
        return Promise.reject(
          new Error(
            `${typeComposer.getTypeName()}.updateById resolver requires args.input._id value`
          )
        );
      }

      resolveParams.args._id = inputData._id;
      delete inputData._id;

      return findByIdResolver.resolve(resolveParams)
        // save changes to DB
        .then(doc => {
          if (!doc) {
            return Promise.reject('Document not found');
          }
          if (inputData) {
            doc.set(inputData);
            return doc.save();
          }
          return doc;
        })
        // prepare output payload
        .then(record => {
          if (record) {
            return {
              record: record.toObject(),
              recordId: typeComposer.getRecordIdFn()(record),
            };
          }

          return null;
        });
    },
  });

  return resolver;
}
