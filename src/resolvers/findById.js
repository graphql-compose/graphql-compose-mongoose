/* @flow */

import type { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { projectionHelper } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function findById(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: GenResolverOpts // eslint-disable-line no-unused-vars
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findById() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver findById() should be instance of TypeComposer.');
  }

  return new tc.constructor.schemaComposer.Resolver({
    type: tc.getType(),
    name: 'findById',
    kind: 'query',
    args: {
      _id: 'MongoID!',
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
