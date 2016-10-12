/* @flow */

import { GraphQLNonNull } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import GraphQLMongoID from '../types/mongoid';
import { projectionHelper } from './helpers/projection';
import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function findById(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts // eslint-disable-line no-unused-vars
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver findById() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('Second arg for Resolver findById() should be instance of TypeComposer.');
  }

  return new Resolver({
    outputType: typeComposer.getType(),
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
