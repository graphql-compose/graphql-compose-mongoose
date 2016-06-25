/* @flow */

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import {
  GraphQLNonNull,
  GraphQLID,
} from 'graphql';

import { projectionHelper } from './helpers/projection';

export default function findById(model: MongooseModelT, gqType: GraphQLObjectType): Resolver {
  return new Resolver({
    outputType: gqType,
    name: 'findById',
    kind: 'query',
    args: {
      id: {
        name: 'id',
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve: (resolveParams : ExtendedResolveParams = {}) => {
      const args = resolveParams.args || {};

      if (args.id) {
        resolveParams.query = model.findById(args.id); // eslint-disable-line
        projectionHelper(resolveParams);
        return resolveParams.query.exec();
      }
      return Promise.resolve(null);
    },
  });
}
