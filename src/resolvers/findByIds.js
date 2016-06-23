import type {
  MongooseModelT,
  GraphQLOutputType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';
import mongoose from 'mongoose';

import {
  GraphQLNonNull,
  GraphQLList,
  GraphQLID,
} from 'graphql';

import { limitHelperArgs, limitHelper } from './helpers/limit';
import { sortHelperArgs, sortHelper } from './helpers/sort';

export default function findByIds(model: MongooseModelT, outputType: GraphQLOutputType): Resolver {
  return new Resolver(outputType, {
    name: 'findByIds',
    args: {
      ids: {
        name: 'ids',
        type: new GraphQLNonNull(new GraphQLList(GraphQLID)),
      },
      ...limitHelperArgs,
      ...sortHelperArgs,
    },
    resolve: ({ args, projection } = {}) => {
      const selector = {};
      if (args && Array.isArray(args.ids)) {
        selector._id = {
          $in: args.ids
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => mongoose.Types.ObjectId(id)), // eslint-disable-line
        };
      } else {
        return Promise.resolve([]);
      }

      let cursor = model.find(selector).select(projection);
      cursor = limitHelper(cursor, args || {});
      cursor = sortHelper(cursor, args || {});
      return cursor.exec();
    },
  });
}
