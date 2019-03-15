/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { MongooseDocument } from 'mongoose';
import {
  limitHelper,
  limitHelperArgs,
  skipHelper,
  skipHelperArgs,
  filterHelper,
  filterHelperArgs,
  sortHelper,
  sortHelperArgs,
  projectionHelper,
} from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function findMany<TSource: MongooseDocument, TContext>(
  model: Class<TSource>, // === MongooseModel
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findMany() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('Second arg for Resolver findMany() should be instance of ObjectTypeComposer.');
  }

  return tc.sc.createResolver({
    type: [tc],
    name: 'findMany',
    kind: 'query',
    args: {
      ...filterHelperArgs(tc, model, {
        filterTypeName: `FilterFindMany${tc.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindMany${tc.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      resolveParams.query = model.find();
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);
      return resolveParams.query.exec();
    },
  });
}
