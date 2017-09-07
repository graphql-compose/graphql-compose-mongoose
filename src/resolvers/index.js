/* @flow */

import type { MongooseQuery } from 'mongoose';
import type { ResolveParams } from 'graphql-compose';

import findById from './findById';
import findByIds from './findByIds';
import findOne from './findOne';
import findMany from './findMany';

import updateById from './updateById';
import updateOne from './updateOne';
import updateMany from './updateMany';

import removeById from './removeById';
import removeOne from './removeOne';
import removeMany from './removeMany';

import createOne from './createOne';
import count from './count';

import type {
  FilterHelperArgsOpts,
  SortHelperArgsOpts,
  RecordHelperArgsOpts,
  LimitHelperArgsOpts,
} from './helpers';

export type GenResolverOpts = {
  filter?: FilterHelperArgsOpts,
  sort?: SortHelperArgsOpts,
  record?: RecordHelperArgsOpts,
  limit?: LimitHelperArgsOpts,
};

export type ExtendedResolveParams = $Shape<ResolveParams<*, *>> & {
  query: MongooseQuery<*, *>,
  rawQuery: { [optName: string]: any },
  beforeQuery?: (query: mixed, rp: ExtendedResolveParams) => Promise<*>,
  beforeRecordMutate?: (record: mixed, rp: ExtendedResolveParams) => Promise<*>,
};

export {
  findById,
  findByIds,
  findOne,
  findMany,
  updateById,
  updateOne,
  updateMany,
  removeById,
  removeOne,
  removeMany,
  createOne,
  count,
};

export function getAvailableNames(): string[] {
  return [
    'findById',
    'findByIds',
    'findOne',
    'findMany',
    'updateById',
    'updateOne',
    'updateMany',
    'removeById',
    'removeOne',
    'removeMany',
    'createOne',
    'count',
  ];
}
