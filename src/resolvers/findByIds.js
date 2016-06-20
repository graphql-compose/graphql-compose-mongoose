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


export default function findByIds(model: MongooseModelT, outputType: GraphQLOutputType): Resolver {
  return new Resolver(outputType, {
    name: 'findByIds',
    args: {
      ids: {
        name: 'ids',
        type: new GraphQLNonNull(new GraphQLList(GraphQLID)),
      },
    },
    resolve: ({ args, projection }) => {
      const selector = {};
      if (args && args.ids && Array.isArray(args.ids)) {
        selector._id = {
          $in: args.ids.map((id) => mongoose.Types.ObjectId(id)), // eslint-disable-line
        };
      } else {
        return [];
      }

      return model.find(selector).select(projection);
    },
  });
}
