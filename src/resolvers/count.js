/* @flow */
/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';
import { GraphQLInt } from 'graphql';

import { filterHelperArgsGen, filterHelper } from './helpers/filter';

export default function count(model: MongooseModelT, gqType: GraphQLObjectType): Resolver {
  return new Resolver({
    outputType: GraphQLInt,
    name: 'count',
    kind: 'query',
    args: {
      ...filterHelperArgsGen(model, {
        filterTypeName: `Filter${gqType.name}Input`,
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      resolveParams.query = model.find();
      filterHelper(resolveParams);
      return resolveParams.query.count().exec();
    },
  });
}
