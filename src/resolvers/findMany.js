/* @flow */
/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';
import {
  GraphQLList,
} from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgsGen, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

export default function findMany(model: MongooseModelT, gqType: GraphQLObjectType): Resolver {
  return new Resolver({
    outputType: new GraphQLList(gqType),
    name: 'findMany',
    kind: 'query',
    args: {
      ...filterHelperArgsGen(model, {
        filterTypeName: `Filter${gqType.name}Input`,
      }),
      ...skipHelperArgs,
      ...limitHelperArgs,
      ...sortHelperArgsGen(model, {
        sortTypeName: `Sort${gqType.name}Input`,
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      resolveParams.query = model.find({}); // eslint-disable-line
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);
      return resolveParams.query.exec();
    },
  });
}
