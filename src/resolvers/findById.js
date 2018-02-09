/* @flow */

import { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import GraphQLMongoID from '../types/mongoid';
import { projectionHelper } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function findById(
  model: MongooseModel,
  typeComposer: TypeComposer,
  opts?: GenResolverOpts // eslint-disable-line no-unused-vars
): Resolver<*, *> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findById() should be instance of Mongoose Model.');
  }

  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver findById() should be instance of TypeComposer.');
  }

  return new Resolver({
    type: typeComposer.getType(),
    name: 'findById',
    kind: 'query',
    args: {
      _id: {
        name: '_id',
        type: new GraphQLNonNull(GraphQLMongoID),
      },
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
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
