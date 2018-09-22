import { Resolver, TypeComposer } from 'graphql-compose';
import { Document, Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import {
  FilterHelperArgs,
  LimitHelperArgs,
  SkipHelperArgs,
  SortHelperArgs,
} from './helpers';
import { GenResolverOpts } from './index';

export default function findMany<
  TSource extends Document = any,
  TContext = any,
  TArgs = any
>(
  model: Model<TSource>,
  tc: TypeComposer<TSource>,
  opts?: GenResolverOpts,
): Resolver<TSource, TContext, TArgs>;

export type FindManyArgs<TSource, IndexedFieldsMap = { _id: MongoId }> = {
  filter: FilterHelperArgs<TSource, IndexedFieldsMap>;
  skip: SkipHelperArgs;
  limit: LimitHelperArgs;
  sort: SortHelperArgs;
};

export type FindManyRSource<TSource> = TSource[];
