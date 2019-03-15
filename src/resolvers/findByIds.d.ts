import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { LimitHelperArgs, SortHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export default function findByIds(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type FindByIdsArgs = {
  _ids: [MongoId];
  limit: LimitHelperArgs;
  sort: SortHelperArgs;
};

export type FindByIdsRSource<TSource> = TSource[];
