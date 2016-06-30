/* @flow */
/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';
import { GraphQLInt } from 'graphql';

import { filterHelperArgs, filterHelper } from './helpers/filter';


export default function count(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts,
): Resolver {
  return new Resolver({
    outputType: GraphQLInt,
    name: 'count',
    kind: 'query',
    args: {
      ...filterHelperArgs(gqType, {
        filterTypeName: `Filter${gqType.name}Input`,
        model,
        ...(opts && opts.filter),
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      resolveParams.query = model.find();
      filterHelper(resolveParams);
      return resolveParams.query.count().exec();
    },
  });
}
