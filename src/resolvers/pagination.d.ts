import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { FilterHelperArgs, SortHelperArgs } from './helpers';

export type PaginationResolverOpts = {
  perPage?: number;
};

export default function pagination(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: PaginationResolverOpts,
): Resolver<any, any> | undefined;

export type PaginationArgs<TSource, IndexedFields = { _id: MongoId }> = {
  page: number;
  perPage: number;
  filter: FilterHelperArgs<TSource, IndexedFields>;
  sort: SortHelperArgs;
};

export type PaginationPageInfo = {
  currentPage?: number;
  perPage: number;
  perCount: number;
  itemCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginationRSource<TSource> = {
  count: number;
  items: TSource[];
  pageInfo: PaginationPageInfo;
};
