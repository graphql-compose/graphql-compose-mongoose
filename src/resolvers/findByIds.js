/* @flow */

import { GraphQLNonNull, GraphQLList } from 'graphql';
import mongoose from 'mongoose';
import { Resolver, TypeComposer } from 'graphql-compose';
import GraphQLMongoID from '../types/mongoid';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';
import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function findByIds(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver findByIds() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('Second arg for Resolver findByIds() should be instance of TypeComposer.');
  }

  return new Resolver({
    outputType: new GraphQLList(typeComposer.getType()),
    name: 'findByIds',
    kind: 'query',
    args: {
      _ids: {
        name: '_ids',
        type: new GraphQLNonNull(new GraphQLList(GraphQLMongoID)),
      },
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortFindByIds${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (!Array.isArray(args._ids)) {
        return Promise.resolve([]);
      }

      const selector = {};
      selector._id = {
        $in: args._ids
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => mongoose.Types.ObjectId(id)), // eslint-disable-line
      };

      resolveParams.query = model.find(selector); // eslint-disable-line
      projectionHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      return resolveParams.query.exec();
    },
  });
}
