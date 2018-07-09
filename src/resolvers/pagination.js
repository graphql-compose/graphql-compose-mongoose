/* @flow */
/* eslint-disable global-require */

import type { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';

export type PaginationResolverOpts = {
  perPage?: number,
};

export default function pagination(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: PaginationResolverOpts
): ?Resolver {
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
    ...opts,
  });

  return resolver;
}
