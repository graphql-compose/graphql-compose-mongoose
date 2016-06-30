/* @flow */
/* eslint-disable no-param-reassign */

import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgs, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function findOne(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts,
): Resolver {
  return new Resolver({
    outputType: gqType,
    name: 'findOne',
    kind: 'query',
    args: {
      ...filterHelperArgs(gqType, {
        filterTypeName: `Filter${gqType.name}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...skipHelperArgs(),
      ...sortHelperArgs(model, {
        sortTypeName: `Sort${gqType.name}Input`,
        ...(opts && opts.sort),
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
