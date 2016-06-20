import type {
  MongooseModelT,
  GraphQLOutputType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import {
  GraphQLNonNull,
  GraphQLID,
} from 'graphql';


export default function findById(model: MongooseModelT, outputType: GraphQLOutputType): Resolver {
  return new Resolver(outputType, {
    name: 'findById',
    args: {
      id: {
        name: 'id',
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve: ({ args, projection }) => {
      return model.findById(args.id, projection);
    },
  });
}
