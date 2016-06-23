/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLOutputType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';

export default function findOne(model: MongooseModelT, outputType: GraphQLOutputType): Resolver {
  const filterHelperArgs = filterHelperArgsGen();

  return new Resolver(outputType, {
    name: 'findOne',
    args: {
      ...filterHelperArgs,
      ...skipHelperArgs,
      ...sortHelperArgs,
    },
    resolve: ({ args, projection } = {}) => {
      let cursor = model.findOne({}, projection);
      cursor = filterHelper(cursor, args || {});
      cursor = skipHelper(cursor, args || {});
      cursor = sortHelper(cursor, args || {});

      return cursor.exec();
    },
  });
}
