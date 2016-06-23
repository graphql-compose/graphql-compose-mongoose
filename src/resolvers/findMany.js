/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLOutputType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

export default function findMany(model: MongooseModelT, outputType: GraphQLOutputType): Resolver {
  const filterHelperArgs = filterHelperArgsGen();

  return new Resolver(outputType, {
    name: 'findMany',
    args: {
      ...filterHelperArgs,
      ...skipHelperArgs,
      ...limitHelperArgs,
      ...sortHelperArgs,
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
