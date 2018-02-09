/* @flow */

import { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { GraphQLNonNull, GraphQLList } from 'graphql-compose/lib/graphql';
import GraphQLMongoID from '../types/mongoid';
import {
  limitHelper,
  limitHelperArgs,
  sortHelper,
  sortHelperArgs,
  projectionHelper,
} from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function findByIds(
  model: MongooseModel,
  typeComposer: TypeComposer,
  opts?: GenResolverOpts
): Resolver<*, *> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findByIds() should be instance of Mongoose Model.');
  }

  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver findByIds() should be instance of TypeComposer.');
  }

  return new Resolver({
    type: [typeComposer],
    name: 'findByIds',
    kind: 'query',
    args: {
      _ids: {
        name: '_ids',
        type: new GraphQLNonNull(new GraphQLList(GraphQLMongoID)),
      },
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortFindByIds${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (!Array.isArray(args._ids) || args._ids.length === 0) {
        return Promise.resolve([]);
      }

      const selector = {
        _id: { $in: args._ids },
      };

      resolveParams.query = model.find(selector); // eslint-disable-line
      projectionHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      return resolveParams.query.exec();
    },
  });
}
