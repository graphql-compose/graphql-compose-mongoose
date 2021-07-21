import type { Resolver, ObjectTypeComposer, InterfaceTypeComposer } from 'graphql-compose';
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
  findManyResolver?: Resolver;
  countResolver?: Resolver;
  countOpts?: CountResolverOpts;
  findManyOpts?: FindManyResolverOpts;
};

export function pagination<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext> | InterfaceTypeComposer<TDoc, TContext>,
  opts?: PaginationResolverOpts
): Resolver<TSource, TContext, PaginationTArgs, TDoc> {
  const { countOpts, findManyOpts, findManyResolver, countResolver, ...restOpts } = opts || {};
  const resolver = preparePaginationResolver<any, any>(tc, {
    findManyResolver: findManyResolver || findMany(model, tc, findManyOpts),
    countResolver: countResolver || count(model, tc, countOpts),
    ...restOpts,
  });
  return resolver;
}
