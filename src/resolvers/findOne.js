/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLObjectType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgsGen, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

export default function findOne(model: MongooseModelT, gqType: GraphQLObjectType): Resolver {
  const filterHelperArgs = filterHelperArgsGen();

  return new Resolver({
    outputType: gqType,
    name: 'findOne',
    kind: 'query',
    args: {
      ...filterHelperArgs,
      ...skipHelperArgs,
      ...sortHelperArgsGen(model),
    },
    resolve: (resolveParams = {}) => {
      resolveParams.cursor = model.findOne({}); // eslint-disable-line
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);

      return resolveParams.cursor.exec();
    },
  });
}
