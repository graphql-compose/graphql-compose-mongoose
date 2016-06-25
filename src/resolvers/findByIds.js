/* @flow */

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';
import mongoose from 'mongoose';

import {
  GraphQLNonNull,
  GraphQLList,
  GraphQLID,
} from 'graphql';

import { limitHelperArgs, limitHelper } from './helpers/limit';
import { sortHelperArgsGen, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

export default function findByIds(model: MongooseModelT, gqType: GraphQLObjectType): Resolver {
  return new Resolver({
    outputType: new GraphQLList(gqType),
    name: 'findByIds',
    kind: 'query',
    args: {
      ids: {
        name: 'ids',
        type: new GraphQLNonNull(new GraphQLList(GraphQLID)),
      },
      ...limitHelperArgs,
      ...sortHelperArgsGen(model, {
        sortTypeName: `Sort${gqType.name}Input`,
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams = {}) => {
      const args = resolveParams.args || {};

      const selector = {};
      if (Array.isArray(args.ids)) {
        selector._id = {
          $in: args.ids
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
