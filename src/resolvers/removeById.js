/* @flow */
/* eslint-disable no-param-reassign */

import { projectionHelper } from './helpers/projection';
import {
  GraphQLObjectType,
  GraphQLNonNull,
} from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

export default function removeById(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts, // eslint-disable-line no-unused-vars
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver removeById() should be instance of Mongoose Model.'
    );
  }

  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error(
      'Second arg for Resolver removeById() should be instance of GraphQLObjectType.'
    );
  }

  const resolver = new Resolver({
    name: 'removeById',
    kind: 'mutation',
    description: 'Remove one document: '
               + '1) Retrieve one document and remove with hooks via findByIdAndRemove. '
               + '2) Return removed document.',
    outputType: new GraphQLObjectType({
      name: `RemoveById${gqType.name}Payload`,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Removed document ID',
        },
        record: {
          type: gqType,
          description: 'Removed document',
        },
      },
    }),
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
          new Error(`${gqType.name}.removeById resolver requires args._id value`)
        );
      }

      resolveParams.query = model.findByIdAndRemove(args._id);
      projectionHelper(resolveParams);

      return resolveParams.query.exec()
        .then(res => {
          if (res) {
            return {
              record: res.toObject(),
              recordId: res.id,
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
