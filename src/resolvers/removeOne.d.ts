import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { FilterHelperArgs, SortHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export default function removeOne(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type RemoveOneArgs<TSource> = {
  filter: FilterHelperArgs<TSource>;
  sort: SortHelperArgs;
};

export type RemoveOneRSource<TSource> = {
  recordId: MongoId;
  record: TSource;
};
