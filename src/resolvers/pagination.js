/* @flow */
/* eslint-disable global-require */

import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { MongooseDocument } from 'mongoose';

export type PaginationResolverOpts = {
  perPage?: number,
};

export default function pagination<TSource: MongooseDocument, TContext>(
  model: Class<TSource>, // === MongooseModel
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: PaginationResolverOpts
): ?Resolver<TSource, TContext> {
  try {
    require.resolve('graphql-compose-pagination');
  } catch (e) {
    return undefined;
  }
  const preparePaginationResolver = require('graphql-compose-pagination').preparePaginationResolver;

  if (!preparePaginationResolver) {
    throw new Error(
      'You should update `graphql-compose-pagination` package till 3.3.0 version or above'
    );
  }

  const resolver = preparePaginationResolver(tc, {
    findResolverName: 'findMany',
    countResolverName: 'count',
    ...(opts: any),
  });

  return resolver;
}
