/* @flow */

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import { Resolver } from 'graphql-compose';

import {
  GraphQLNonNull,
  GraphQLObjectType,
} from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import { projectionHelper } from './helpers/projection';

export default function findById(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts // eslint-disable-line no-unused-vars
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver findById() should be instance of Mongoose Model.'
    );
  }

  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error('Second arg for Resolver findById() should be instance of GraphQLObjectType.');
  }

  return new Resolver({
    outputType: gqType,
    name: 'findById',
    kind: 'query',
    args: {
      _id: {
        name: '_id',
        type: new GraphQLNonNull(GraphQLMongoID),
      },
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (args._id) {
        resolveParams.query = model.findById(args._id); // eslint-disable-line
        projectionHelper(resolveParams);
        return resolveParams.query.exec();
      }
      return Promise.resolve(null);
    },
  });
}
