/* @flow */
/* eslint-disable no-param-reassign */
import { skipHelperArgs } from './helpers/skip';
import { inputHelperArgs } from './helpers/input';
import { filterHelperArgs } from './helpers/filter';
import { sortHelperArgs } from './helpers/sort';
import findOne from './findOne';
import { GraphQLObjectType } from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import { Resolver, TypeComposer } from 'graphql-compose';


export default function updateOne(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts,
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

  const resolver = new Resolver({
    name: 'updateOne',
    kind: 'mutation',
    description: 'Update one document: '
               + '1) Retrieve one document via findOne. '
               + '2) Apply updates to mongoose document. '
               + '3) Mongoose applies defaults, setters, hooks and validation. '
               + '4) And save it.',
    outputType: new GraphQLObjectType({
      name: `UpdateOne${typeComposer.getTypeName()}Payload`,
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
    }),
    args: {
      ...inputHelperArgs(typeComposer, {
        inputTypeName: `UpdateOne${typeComposer.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        ...(opts && opts.input),
      }),
      ...filterHelperArgs(typeComposer, {
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
      const inputData = resolveParams.args && resolveParams.args.input || null;
      const filterData = resolveParams.args && resolveParams.args.filter || {};

      if (!(typeof filterData === 'object')
        || Object.keys(filterData).length === 0
      ) {
        return Promise.reject(
          new Error(`${typeComposer.getTypeName()}.updateOne resolver requires `
                  + 'at least one value in args.filter')
        );
      }

      return findOneResolver.resolve(resolveParams)
        // save changes to DB
        .then(doc => {
          if (inputData) {
            doc.set(inputData);
            return doc.save();
          }
          return doc;
        })
        // prepare output payload
        .then(record => {
          if (record) {
            return {
              record: record.toObject(),
              recordId: typeComposer.getRecordIdFn()(record),
            };
          }

          return null;
        });
    },
  });

  return resolver;
}
