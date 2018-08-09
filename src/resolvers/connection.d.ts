import { Resolver, TypeComposer } from 'graphql-compose';
// import { ConnectionSortMapOpts } from 'graphql-compose-connection';
import { Model } from 'mongoose';
import { IndexT } from '../utils';

// @ts-todo The ConnectionSortMapOpts is not available yet since graphql-compose-connection doesn't have types for now,
//          fallback to a simple object.
export type ConnectionSortMapOpts = { [opt: string]: any };

export default function connection(
  model: Model<any>,
  tc: TypeComposer<any>,
  opts?: ConnectionSortMapOpts): Resolver<any, any> | undefined;

export function prepareCursorQuery(
  rawQuery: object,
  cursorData: object,
  indexKeys: string[],
  indexData: IndexT,
  nextOper: '$gt' | '$lt',
  prevOper: '$lt' | '$gt'): void;
