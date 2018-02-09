/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import {
  limitHelper,
  limitHelperArgs,
  skipHelper,
  skipHelperArgs,
  recordHelperArgs,
  filterHelper,
  filterHelperArgs,
  sortHelper,
  sortHelperArgs,
} from './helpers';
import toMongoDottedObject from '../utils/toMongoDottedObject';
import typeStorage from '../typeStorage';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function updateMany(
  model: MongooseModel,
  typeComposer: TypeComposer,
  opts?: GenResolverOpts
): Resolver<*, *> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateMany() should be instance of Mongoose Model.');
  }
  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver updateMany() should be instance of TypeComposer.');
  }

  const outputTypeName = `UpdateMany${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    TypeComposer.create({
      name: outputTypeName,
      fields: {
        numAffected: {
          type: 'Int',
          description: 'Affected documents number',
        },
      },
    })
  );

  const resolver = new Resolver({
    name: 'updateMany',
    kind: 'mutation',
    description:
      'Update many documents without returning them: ' +
      'Use Query.update mongoose method. ' +
      'Do not apply mongoose defaults, setters, hooks and validation. ',
    type: outputType,
    args: {
      ...recordHelperArgs(typeComposer, {
        recordTypeName: `UpdateMany${typeComposer.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        ...(opts && opts.record),
      }),
      ...filterHelperArgs(typeComposer, model, {
        filterTypeName: `FilterUpdateMany${typeComposer.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortUpdateMany${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || {};

      if (!(typeof recordData === 'object') || Object.keys(recordData).length === 0) {
        return Promise.reject(
          new Error(
            `${typeComposer.getTypeName()}.updateMany resolver requires ` +
              'at least one value in args.record'
          )
        );
      }

      resolveParams.query = model.find();
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      limitHelper(resolveParams);

      resolveParams.query = resolveParams.query.setOptions({ multi: true }); // eslint-disable-line
      resolveParams.query.update({ $set: toMongoDottedObject(recordData) });

      // `beforeQuery` is experemental feature, if you want to use it
      // please open an issue with your use case, cause I suppose that
      // this option is excessive
      return (resolveParams.beforeQuery
        ? Promise.resolve(resolveParams.beforeQuery(resolveParams.query, resolveParams))
        : resolveParams.query.exec()
      ).then(res => {
        if (res.ok) {
          return {
            numAffected: res.nModified,
          };
        }

        return Promise.reject(res);
      });
    },
  });

  return resolver;
}
