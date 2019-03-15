import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { FindOneArgs } from './findOne';
import { RecordHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export default function updateOne(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type UpdateOneArgs<
  TSource,
  IndexedFields = { _id: MongoId }
> = RecordHelperArgs<TSource> & FindOneArgs<TSource, IndexedFields>;
