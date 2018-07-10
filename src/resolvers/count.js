/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { filterHelper, filterHelperArgs } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function count(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: GenResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver count() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver count() should be instance of TypeComposer.');
  }

  return new tc.constructor.schemaComposer.Resolver({
    type: 'Int',
    name: 'count',
    kind: 'query',
    args: {
      ...filterHelperArgs(tc, model, {
        filterTypeName: `Filter${tc.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      resolveParams.query = model.find();
      filterHelper(resolveParams);
      if (resolveParams.query.countDocuments) {
        // mongoose 5.2.0 and above
        return resolveParams.query.countDocuments().exec();
      } else {
        // mongoose 5 and below
        return resolveParams.query.count().exec();
      }
    },
  });
}
