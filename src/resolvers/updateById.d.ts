import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { RecordHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export default function updateById(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type UpdateByIdArgs<TSource> = RecordHelperArgs<TSource>;

export type UpdateByIdRSource<TSource> = {
  recordId: MongoId;
  record: TSource;
};
