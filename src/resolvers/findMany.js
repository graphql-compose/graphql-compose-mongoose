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
    resolve: ({ args, projection } = {}) => {
      let cursor = model.find({}, projection);
      cursor = filterHelper(cursor, args || {});
      cursor = skipHelper(cursor, args || {});
      cursor = limitHelper(cursor, args || {});
      cursor = sortHelper(cursor, args || {});

      return cursor.exec();
    },
  });
}
