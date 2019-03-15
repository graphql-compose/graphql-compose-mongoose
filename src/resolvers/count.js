/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { MongooseDocument } from 'mongoose';
import { filterHelper, filterHelperArgs } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function count<TSource: MongooseDocument, TContext>(
  model: Class<TSource>, // === MongooseModel
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver count() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('Second arg for Resolver count() should be instance of ObjectTypeComposer.');
  }

  return tc.sc.createResolver({
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
