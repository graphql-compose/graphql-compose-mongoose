/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLOutputType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';


export default function removeOne(model: MongooseModelT, outputType: GraphQLOutputType): Resolver {
  const filterHelperArgs = filterHelperArgsGen();

  return new Resolver(outputType, {
    name: 'removeOne',
    args: {
      ...filterHelperArgs,
      ...skipHelperArgs,
    },
    resolve: ({ args, projection }) => {
      let cursor = model.findOneAndRemove({}, projection);
      cursor = filterHelper(cursor, args);
      cursor = skipHelper(cursor, args);

      return cursor;
    },
  });
}
