/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLOutputType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

export default function findOne(model: MongooseModelT, outputType: GraphQLOutputType): Resolver {
  const filterHelperArgs = filterHelperArgsGen();

  return new Resolver(outputType, {
    name: 'findOne',
    args: {
      ...filterHelperArgs,
      ...skipHelperArgs,
      ...sortHelperArgs,
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
