import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { FilterHelperArgs, SkipHelperArgs, SortHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export default function findOne(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type FindOneArgs<TSource, IndexedFieldsMap = { _id: MongoId }> = {
  filter: FilterHelperArgs<TSource, IndexedFieldsMap>;
  skip: SkipHelperArgs;
  sort: SortHelperArgs;
};

export type FindOneRSource<TSource> = TSource;
