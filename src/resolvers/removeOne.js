/* @flow */
/* eslint-disable no-param-reassign */

import { GraphQLObjectType, GraphQLNonNull } from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgsGen, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

import type {
  MongooseModelT,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

export default function removeOne(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
): Resolver {
  const resolver = new Resolver({
    name: 'removeOne',
    kind: 'mutation',
    description: 'Remove one document: '
               + '1) Remove with hooks via findOneAndRemove. '
               + '2) Return removed document.',
    outputType: new GraphQLObjectType({
      name: `RemoveOne${gqType.name}Payload`,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Removed document ID',
        },
        record: {
          type: gqType,
          description: 'Removed document',
        },
      },
    }),
    args: {
      ...filterHelperArgsGen(model, {
        filterTypeName: `Filter${gqType.name}Input`,
      }),
      ...sortHelperArgsGen(model, {
        sortTypeName: `Sort${gqType.name}Input`,
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      resolveParams.query = model.findOneAndRemove({});
      filterHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);

      return resolveParams.query
        .exec()
        .then(res => {
          if (res) {
            return {
              record: res.toObject(),
              recordId: res.id,
            };
          }

          return null;
        });
    },
  });

  return resolver;
}
