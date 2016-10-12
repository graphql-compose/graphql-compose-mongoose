/* @flow */
/* eslint-disable no-param-reassign */

import { GraphQLObjectType } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { skipHelperArgs } from './helpers/skip';
import { recordHelperArgs } from './helpers/record';
import { filterHelperArgs } from './helpers/filter';
import { sortHelperArgs } from './helpers/sort';
import findOne from './findOne';
import GraphQLMongoID from '../types/mongoid';
import typeStorage from '../typeStorage';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function updateOne(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver updateOne() should be instance of Mongoose Model.'
    );
  }
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error(
      'Second arg for Resolver updateOne() should be instance of TypeComposer.'
    );
  }

  const findOneResolver = findOne(model, typeComposer, opts);

  const outputTypeName = `UpdateOne${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    new GraphQLObjectType({
      name: outputTypeName,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Updated document ID',
        },
        record: {
          type: typeComposer.getType(),
          description: 'Updated document',
        },
      },
    })
  );

  const resolver = new Resolver({
    name: 'updateOne',
    kind: 'mutation',
    description: 'Update one document: '
               + '1) Retrieve one document via findOne. '
               + '2) Apply updates to mongoose document. '
               + '3) Mongoose applies defaults, setters, hooks and validation. '
               + '4) And save it.',
    outputType,
    args: {
      ...recordHelperArgs(typeComposer, {
        recordTypeName: `UpdateOne${typeComposer.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        ...(opts && opts.record),
      }),
      ...filterHelperArgs(typeComposer, model, {
        filterTypeName: `FilterUpdateOne${typeComposer.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortUpdateOne${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
      ...skipHelperArgs(),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || null;
      const filterData = (resolveParams.args && resolveParams.args.filter) || {};

      if (!(typeof filterData === 'object')
        || Object.keys(filterData).length === 0
      ) {
        return Promise.reject(
          new Error(`${typeComposer.getTypeName()}.updateOne resolver requires `
                  + 'at least one value in args.filter')
        );
      }

      resolveParams.projection =
        (resolveParams.projection && resolveParams.projection.record) || {};

      return findOneResolver.resolve(resolveParams)
        .then(doc => {
          if (resolveParams.beforeRecordMutate) {
            return resolveParams.beforeRecordMutate(doc);
          }
          return doc;
        })
        // save changes to DB
        .then(doc => {
          if (recordData) {
            doc.set(recordData);
            return doc.save();
          }
          return doc;
        })
        // prepare output payload
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
