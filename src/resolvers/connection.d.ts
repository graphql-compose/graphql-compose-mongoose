import { Resolver, ObjectTypeComposer } from 'graphql-compose';
// import { ConnectionSortMapOpts } from 'graphql-compose-connection';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { IndexT } from '../utils';
import { FilterHelperArgs, SortHelperArgs } from './helpers';

// @ts-todo The ConnectionSortMapOpts is not available yet since graphql-compose-connection doesn't have types for now,
//          fallback to a simple object.
export type ConnectionSortMapOpts = { [opt: string]: any };

export default function connection(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: ConnectionSortMapOpts,
): Resolver<any, any> | undefined;

export function prepareCursorQuery(
  rawQuery: object,
  cursorData: object,
  indexKeys: string[],
  indexData: IndexT,
  nextOper: '$gt' | '$lt',
  prevOper: '$lt' | '$gt',
): void;

export type ConnectionArgs<TSource, IndexedFields = { _id: MongoId }> = {
  first: number;
  after: string;
  last: number;
  before: string;
  filter: FilterHelperArgs<TSource, IndexedFields>;
  sort: SortHelperArgs;
};

export type ConnectionPageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
};

export type ConnectionEdges<TSource> = {
  node: TSource;
  cursor: number;
};

export type ConnectionRSource<TSource> = {
  count: number;
  pageInfo: ConnectionPageInfo;
  edges: ConnectionEdges<TSource>;
};
