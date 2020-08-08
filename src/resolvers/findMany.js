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
  prepareAliases,
} from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';

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

  const aliases = prepareAliases(model);

  return tc.schemaComposer.createResolver({
    type: tc.getTypeNonNull().getTypePlural(),
    name: 'findMany',
    kind: 'query',
    args: {
      ...filterHelperArgs(tc, model, {
        filterTypeName: `FilterFindMany${tc.getTypeName()}Input`,
        model,
        ...(opts && (opts.filter: any)),
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
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);
      skipHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams, aliases);
      return beforeQueryHelper(resolveParams);
    },
  });
}
