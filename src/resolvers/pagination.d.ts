import { Resolver, TypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';

export type PaginationResolverOpts = {
  perPage?: number,
};

export default function pagination(
  model: Model<any>,
  tc: TypeComposer<any>,
  opts?: PaginationResolverOpts): Resolver<any, any> | undefined;
