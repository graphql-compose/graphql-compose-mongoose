/* @flow */
/* eslint-disable no-param-reassign */

import { GraphQLObjectType } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import GraphQLMongoID from '../types/mongoid';
import typeStorage from '../typeStorage';
import { filterHelperArgs, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';
import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function removeOne(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver removeOne() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error(
      'Second arg for Resolver removeOne() should be instance of TypeComposer.'
    );
  }

  const outputTypeName = `RemoveOne${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    new GraphQLObjectType({
      name: outputTypeName,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Removed document ID',
        },
        record: {
          type: typeComposer.getType(),
          description: 'Removed document',
        },
      },
    })
  );

  const resolver = new Resolver({
    name: 'removeOne',
    kind: 'mutation',
    description: 'Remove one document: '
               + '1) Remove with hooks via findOneAndRemove. '
               + '2) Return removed document.',
    outputType,
    args: {
      ...filterHelperArgs(typeComposer, model, {
        filterTypeName: `FilterRemoveOne${typeComposer.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortRemoveOne${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      resolveParams.query = model.findOneAndRemove({});
      filterHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);

      return (
        resolveParams.beforeQuery
          ? Promise.resolve(resolveParams.beforeQuery(resolveParams.query))
          : resolveParams.query.exec()
        )
        .then(record => {
          if (record) {
            return {
              record,
              recordId: typeComposer.getRecordIdFn()(record),
            };
          }

          return null;
        });
    },
  });

  return resolver;
}
