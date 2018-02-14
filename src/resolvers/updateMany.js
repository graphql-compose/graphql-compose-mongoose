/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, TypeComposer } from 'graphql-compose';
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
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function updateMany(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: GenResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateMany() should be instance of Mongoose Model.');
  }
  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver updateMany() should be instance of TypeComposer.');
  }

  const outputTypeName = `UpdateMany${tc.getTypeName()}Payload`;
  const outputType = tc.constructor.schemaComposer.getOrCreateTC(outputTypeName, t => {
    t.addFields({
      numAffected: {
        type: 'Int',
        description: 'Affected documents number',
      },
    });
  });

  const resolver = new tc.constructor.schemaComposer.Resolver({
    name: 'updateMany',
    kind: 'mutation',
    description:
      'Update many documents without returning them: ' +
      'Use Query.update mongoose method. ' +
      'Do not apply mongoose defaults, setters, hooks and validation. ',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        recordTypeName: `UpdateMany${tc.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        ...(opts && opts.record),
      }),
      ...filterHelperArgs(tc, model, {
        filterTypeName: `FilterUpdateMany${tc.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortUpdateMany${tc.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
    },
    resolve: async (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || {};

      if (!(typeof recordData === 'object') || Object.keys(recordData).length === 0) {
        return Promise.reject(
          new Error(
            `${tc.getTypeName()}.updateMany resolver requires ` +
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

      let res;

      // `beforeQuery` is experemental feature, if you want to use it
      // please open an issue with your use case, cause I suppose that
      // this option is excessive

      if (resolveParams.beforeQuery) {
        res = await resolveParams.beforeQuery(resolveParams.query, resolveParams);
      } else {
        res = await resolveParams.query.exec();
      }

      if (res.ok) {
        return {
          numAffected: res.n || res.nModified,
        };
      }

      // unexpected response
      throw new Error(JSON.stringify(res));
    },
  });

  return resolver;
}
