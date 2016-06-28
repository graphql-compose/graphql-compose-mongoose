/* @flow */
/* eslint-disable no-param-reassign */

import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgsGen, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
} from '../definition';

export default function findOne(
  model: MongooseModelT,
  gqType: GraphQLObjectType
): Resolver {
  return new Resolver({
    outputType: gqType,
    name: 'findOne',
    kind: 'query',
    args: {
      ...filterHelperArgsGen(model, {
        filterTypeName: `Filter${gqType.name}Input`,
      }),
      ...skipHelperArgs,
      ...sortHelperArgsGen(model, {
        sortTypeName: `Sort${gqType.name}Input`,
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      resolveParams.query = model.findOne({}); // eslint-disable-line
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);

      return resolveParams.query.exec();
    },
  });
}
