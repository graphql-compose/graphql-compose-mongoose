/* @flow */
/* eslint-disable no-param-reassign */

import { GraphQLObjectType } from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import { filterHelperArgs, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import { Resolver } from 'graphql-compose';


export default function removeOne(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts,
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver removeOne() should be instance of Mongoose Model.'
    );
  }

  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error(
      'Second arg for Resolver removeOne() should be instance of GraphQLObjectType.'
    );
  }

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
      ...filterHelperArgs(gqType, {
        filterTypeName: `FilterRemoveOne${gqType.name}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortRemoveOne${gqType.name}Input`,
        ...(opts && opts.sort),
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
