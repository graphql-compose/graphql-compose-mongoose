import type { ResolverResolveParams } from 'graphql-compose';
import type { Query, Model } from 'mongoose';
import connection from './connection';
import count from './count';
import createMany from './createMany';

import createOne from './createOne';

import findById from './findById';
import findByIds from './findByIds';
import findMany from './findMany';
import findOne from './findOne';

import findByIdLean from './findByIdLean';
import findByIdsLean from './findByIdsLean';
import findManyLean from './findManyLean';
import findOneLean from './findOneLean';

import dataLoader from './dataLoader';
import dataLoaderLean from './dataLoaderLean';
import dataLoaderMany from './dataLoaderMany';
import dataLoaderManyLean from './dataLoaderManyLean';

import type {
  FilterHelperArgsOpts,
  LimitHelperArgsOpts,
  RecordHelperArgsOpts,
  SortHelperArgsOpts,
} from './helpers';

import pagination from './pagination';

import removeById from './removeById';
import removeMany from './removeMany';
import removeOne from './removeOne';

import updateById from './updateById';
import updateMany from './updateMany';
import updateOne from './updateOne';

export type GenResolverOpts = {
  filter?: FilterHelperArgsOpts;
  sort?: SortHelperArgsOpts;
  record?: RecordHelperArgsOpts;
  records?: RecordHelperArgsOpts;
  limit?: LimitHelperArgsOpts;
};

export type ExtendedResolveParams = Partial<ResolverResolveParams<any, any, any>> & {
  query: Query<any>;
  rawQuery: { [optName: string]: any };
  beforeQuery?: (query: Query<any>, rp: ExtendedResolveParams) => Promise<any>;
  beforeRecordMutate?: (record: any, rp: ExtendedResolveParams) => Promise<any>;
  model: Model<any>;
};

export {
  findById,
  findByIds,
  findOne,
  findMany,
  findByIdLean,
  findByIdsLean,
  findOneLean,
  findManyLean,
  dataLoader,
  dataLoaderLean,
  dataLoaderMany,
  dataLoaderManyLean,
  updateById,
  updateOne,
  updateMany,
  removeById,
  removeOne,
  removeMany,
  createOne,
  createMany,
  count,
  pagination,
  connection,
};

export function getAvailableNames(): (keyof typeof EMCResolvers)[] {
  return [
    'findById',
    'findByIds',
    'findOne',
    'findMany',
    'findByIdLean',
    'findByIdsLean',
    'findOneLean',
    'findManyLean',
    'dataLoader',
    'dataLoaderLean',
    'dataLoaderMany',
    'dataLoaderManyLean',
    'updateById',
    'updateOne',
    'updateMany',
    'removeById',
    'removeOne',
    'removeMany',
    'createOne',
    'createMany',
    'count',
    'pagination', // should be defined after `findMany` and `count` resolvers
    'connection', // should be defined after `findMany` and `count` resolvers
  ];
}

// Enum MongooseComposeResolvers
export const EMCResolvers = {
  findById: 'findById',
  findByIds: 'findByIds',
  findOne: 'findOne',
  findMany: 'findMany',
  findByIdLean: 'findByIdLean',
  findByIdsLean: 'findByIdsLean',
  findOneLean: 'findOneLean',
  findManyLean: 'findManyLean',
  dataLoader: 'dataLoader',
  dataLoaderLean: 'dataLoaderLean',
  dataLoaderMany: 'dataLoaderMany',
  dataLoaderManyLean: 'dataLoaderManyLean',
  updateById: 'updateById',
  updateOne: 'updateOne',
  updateMany: 'updateMany',
  removeById: 'removeById',
  removeOne: 'removeOne',
  removeMany: 'removeMany',
  createOne: 'createOne',
  createMany: 'createMany',
  count: 'count',
  connection: 'connection',
  pagination: 'pagination',
};
