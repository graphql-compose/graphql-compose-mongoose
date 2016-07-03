/* @flow */
/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import { Resolver } from 'graphql-compose';
import { GraphQLInt, GraphQLObjectType } from 'graphql';

import { filterHelperArgs, filterHelper } from './helpers/filter';


export default function count(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts,
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver count() should be instance of Mongoose Model.'
    );
  }

  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error('Second arg for Resolver count() should be instance of GraphQLObjectType.');
  }

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
