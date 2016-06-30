/* @flow */

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';
import mongoose from 'mongoose';

import {
  GraphQLNonNull,
  GraphQLList,
  GraphQLObjectType,
} from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import { limitHelperArgs, limitHelper } from './helpers/limit';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

export default function findByIds(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver findByIds() should be instance of Mongoose Model.'
    );
  }

  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error('Second arg for Resolver findByIds() should be instance of GraphQLObjectType.');
  }

  return new Resolver({
    outputType: new GraphQLList(gqType),
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
        sortTypeName: `Sort${gqType.name}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      const selector = {};
      if (Array.isArray(args._ids)) {
        selector._id = {
          $in: args._ids
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => mongoose.Types.ObjectId(id)), // eslint-disable-line
        };
      } else {
        return Promise.resolve([]);
      }

      resolveParams.query = model.find(selector); // eslint-disable-line
      projectionHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      return resolveParams.query.exec();
    },
  });
}
