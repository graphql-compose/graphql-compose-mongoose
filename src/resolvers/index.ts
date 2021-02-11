import type { ResolverResolveParams } from 'graphql-compose';
import type { Query, Model, Document } from 'mongoose';
import { count, CountResolverOpts } from './count';
import { findById, FindByIdResolverOpts } from './findById';
import { findByIds, FindByIdsResolverOpts } from './findByIds';
import { findMany, FindManyResolverOpts } from './findMany';
import { findOne, FindOneResolverOpts } from './findOne';
import { createMany, CreateManyResolverOpts } from './createMany';
import { createOne, CreateOneResolverOpts } from './createOne';
import { updateById, UpdateByIdResolverOpts } from './updateById';
import { updateMany, UpdateManyResolverOpts } from './updateMany';
import { updateOne, UpdateOneResolverOpts } from './updateOne';
import { removeById, RemoveByIdResolverOpts } from './removeById';
import { removeMany, RemoveManyResolverOpts } from './removeMany';
import { removeOne, RemoveOneResolverOpts } from './removeOne';
import { dataLoader, DataLoaderResolverOpts } from './dataLoader';
import { dataLoaderMany, DataLoaderManyResolverOpts } from './dataLoaderMany';
import { pagination, PaginationResolverOpts } from './pagination';
import { connection, ConnectionResolverOpts } from './connection';

export type AllResolversOpts = {
  count?: false | CountResolverOpts;
  findById?: false | FindByIdResolverOpts;
  findByIds?: false | FindByIdsResolverOpts;
  findOne?: false | FindOneResolverOpts;
  findMany?: false | FindManyResolverOpts;
  dataLoader?: false | DataLoaderResolverOpts;
  dataLoaderMany?: false | DataLoaderManyResolverOpts;
  createOne?: false | CreateOneResolverOpts;
  createMany?: false | CreateManyResolverOpts;
  updateById?: false | UpdateByIdResolverOpts;
  updateOne?: false | UpdateOneResolverOpts;
  updateMany?: false | UpdateManyResolverOpts;
  removeById?: false | RemoveByIdResolverOpts;
  removeOne?: false | RemoveOneResolverOpts;
  removeMany?: false | RemoveManyResolverOpts;
  connection?: false | ConnectionResolverOpts<any>;
  pagination?: false | PaginationResolverOpts;
};

export type ExtendedResolveParams<TDoc extends Document = any, TContext = any> = Partial<
  ResolverResolveParams<TDoc, TContext, any>
> & {
  query: Query<any, any>;
  rawQuery: { [optName: string]: any };
  beforeQuery?: (query: Query<any, any>, rp: ExtendedResolveParams<TDoc>) => Promise<any>;
  beforeRecordMutate?: (record: TDoc, rp: ExtendedResolveParams<TDoc>) => Promise<any>;
  model: Model<TDoc>;
};

export const resolverFactory = {
  count,
  findById,
  findByIds,
  findOne,
  findMany,
  dataLoader,
  dataLoaderMany,
  createOne,
  createMany,
  updateById,
  updateOne,
  updateMany,
  removeById,
  removeOne,
  removeMany,
  pagination,
  connection,
};

export {
  CountResolverOpts,
  FindByIdResolverOpts,
  FindByIdsResolverOpts,
  FindManyResolverOpts,
  FindOneResolverOpts,
  CreateManyResolverOpts,
  CreateOneResolverOpts,
  UpdateByIdResolverOpts,
  UpdateManyResolverOpts,
  UpdateOneResolverOpts,
  RemoveByIdResolverOpts,
  RemoveManyResolverOpts,
  RemoveOneResolverOpts,
  DataLoaderResolverOpts,
  DataLoaderManyResolverOpts,
  PaginationResolverOpts,
  ConnectionResolverOpts,
};
