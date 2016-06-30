/* @flow */
/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';
import {
  GraphQLList,
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
  return new Resolver({
    outputType: new GraphQLList(gqType),
    name: 'findMany',
    kind: 'query',
    args: {
      ...filterHelperArgs(gqType, {
        filterTypeName: `Filter${gqType.name}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `Sort${gqType.name}Input`,
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
