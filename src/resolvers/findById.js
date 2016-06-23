import type {
  MongooseModelT,
  GraphQLOutputType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import {
  GraphQLNonNull,
  GraphQLID,
} from 'graphql';

import { projectionHelper } from './helpers/projection';

export default function findById(model: MongooseModelT, outputType: GraphQLOutputType): Resolver {
  return new Resolver(outputType, {
    name: 'findById',
    args: {
      id: {
        name: 'id',
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve: (resolveParams = {}) => {
      const args = resolveParams.args || {};

      if (args.id) {
        resolveParams.cursor = model.findById(args.id); // eslint-disable-line
        projectionHelper(resolveParams);
        return resolveParams.cursor.exec();
      }
      return Promise.resolve(null);
    },
  });
}
