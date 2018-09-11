import { ResolveParams } from 'graphql-compose';
import { DocumentQuery } from 'mongoose';
import connection from './connection';
import count from './count';

import createOne from './createOne';
import createMany from './createMany';

import findById from './findById';
import findByIds from './findByIds';
import findMany from './findMany';
import findOne from './findOne';

import {
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

export type ExtendedResolveParams = ResolveParams<any, any> & {
  query: DocumentQuery<any, any>;
  rawQuery: { [optName: string]: any };
  beforeQuery?: (query: any, rp: ExtendedResolveParams) => Promise<any>;
  beforeRecordMutate?: (record: any, rp: ExtendedResolveParams) => Promise<any>;
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
  createMany,
  count,
  pagination,
  connection,
};

export function getAvailableNames(): string[];

export const EMCResolvers: {
  findById: 'findById';
  findByIds: 'findByIds';
  findOne: 'findOne';
  findMany: 'findMany';
  updateById: 'updateById';
  updateOne: 'updateOne';
  updateMany: 'updateMany';
  removeById: 'removeById';
  removeOne: 'removeOne';
  removeMany: 'removeMany';
  createOne: 'createOne';
  createMany: 'createMany';
  count: 'count';
  connection: 'connection';
  pagination: 'pagination';
};
