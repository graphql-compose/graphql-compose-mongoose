import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';

export type PaginationResolverOpts = {
  perPage?: number;
};

type TArgs = {
  page?: number;
  perPage?: number;
  filter?: any;
  sort?: Record<string, any>;
};

export function pagination<TSource = any, TContext = any, TDoc extends Document = any>(
  _model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: PaginationResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> | undefined {
  try {
    require.resolve('graphql-compose-pagination');
  } catch (e) {
    return undefined;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
