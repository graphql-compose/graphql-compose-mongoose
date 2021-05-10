import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  preparePaginationResolver,
  PaginationTArgs,
  PaginationResolverOpts as _PaginationResolverOpts,
} from 'graphql-compose-pagination';
import { CountResolverOpts, count } from './count';
import { FindManyResolverOpts, findMany } from './findMany';

export type PaginationResolverOpts = Omit<
  _PaginationResolverOpts,
  'countResolver' | 'findManyResolver'
> & {
  countOpts?: CountResolverOpts;
  findManyOpts?: FindManyResolverOpts;
};

export function pagination<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: PaginationResolverOpts
): Resolver<TSource, TContext, PaginationTArgs, TDoc> {
  const { countOpts, findManyOpts, ...restOpts } = opts || {};
  const resolver = preparePaginationResolver<any, any>(tc, {
    findManyResolver: findMany(model, tc, findManyOpts),
    countResolver: count(model, tc, countOpts),
    ...restOpts,
  });
  return resolver;
}
