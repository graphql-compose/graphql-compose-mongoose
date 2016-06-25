/* @flow */
/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLObjectType,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';


export default function removeOne(model: MongooseModelT, gqType: GraphQLObjectType): Resolver {
  const filterHelperArgs = filterHelperArgsGen();

  return new Resolver({
    outputType: 'someCrazy',
    name: 'removeOne',
    args: {
      ...filterHelperArgs,
      ...skipHelperArgs,
    },
    resolve: ({ args }) => {
      let cursor = model.findOneAndRemove({});
      cursor = filterHelper(cursor, args);
      cursor = skipHelper(cursor, args);

      return cursor;
    },
  });
}
