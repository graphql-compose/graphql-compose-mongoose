/* @flow */
/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import Resolver from 'graphql-compose/lib/resolver/resolver';
import {
  GraphQLList,
  GraphQLObjectType,
} from 'graphql';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { filterHelperArgs, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';


export default function findMany(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts,
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver findMany() should be instance of Mongoose Model.'
    );
  }

  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error('Second arg for Resolver findMany() should be instance of GraphQLObjectType.');
  }

  return new Resolver({
    outputType: new GraphQLList(gqType),
    name: 'findMany',
    kind: 'query',
    args: {
      ...filterHelperArgs(gqType, {
        filterTypeName: `FilterFindMany${gqType.name}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortFindMany${gqType.name}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      resolveParams.query = model.find();
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);
      return resolveParams.query.exec();
    },
  });
}
