/* @flow */
/* eslint-disable no-param-reassign */

import {
  GraphQLObjectType,
  GraphQLNonNull,
} from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { projectionHelper } from './helpers/projection';
import GraphQLMongoID from '../types/mongoid';
import typeStorage from '../typeStorage';
import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function removeById(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts // eslint-disable-line no-unused-vars
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver removeById() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error(
      'Second arg for Resolver removeById() should be instance of TypeComposer.'
    );
  }

  const outputTypeName = `RemoveById${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    new GraphQLObjectType({
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
    name: 'removeById',
    kind: 'mutation',
    description: 'Remove one document: '
               + '1) Retrieve one document and remove with hooks via findByIdAndRemove. '
               + '2) Return removed document.',
    outputType,
    args: {
      _id: {
        name: '_id',
        type: new GraphQLNonNull(GraphQLMongoID),
      },
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (!args._id) {
        return Promise.reject(
          new Error(`${typeComposer.getTypeName()}.removeById resolver requires args._id value`)
        );
      }

      resolveParams.query = model.findByIdAndRemove(args._id);
      projectionHelper(resolveParams);

      return (
        resolveParams.beforeQuery
          ? Promise.resolve(resolveParams.beforeQuery(resolveParams.query))
          : resolveParams.query.exec()
        )
        .then(record => {
          if (record) {
            return {
              record,
              recordId: typeComposer.getRecordIdFn()(record),
            };
          }

          return {
            recordId: args._id,
          };
        });
    },
  });

  return resolver;
}
