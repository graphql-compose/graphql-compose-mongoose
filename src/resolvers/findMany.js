/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLObjectType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';
import {
  GraphQLList,
} from 'graphql';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgsGen, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

export default function findMany(model: MongooseModelT, gqType: GraphQLObjectType): Resolver {
  const filterHelperArgs = filterHelperArgsGen();

  return new Resolver({
    outputType: new GraphQLList(gqType),
    name: 'findMany',
    kind: 'query',
    args: {
      ...filterHelperArgs,
      ...skipHelperArgs,
      ...limitHelperArgs,
      ...sortHelperArgsGen(model),
    },
    resolve: (resolveParams = {}) => {
      resolveParams.cursor = model.find({}); // eslint-disable-line
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);
      return resolveParams.cursor.exec();
    },
  });
}
