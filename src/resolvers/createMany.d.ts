import { Resolver, TypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { RecordsHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export type CreateManyArgs<TSource> = RecordsHelperArgs<TSource>;
export type CreateManyRSource<TSource> = {
  records: TSource[];
  recordIds: MongoId[];
  createCount: number;
};

export default function createMany(
  model: Model<any>,
  tc: TypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;
