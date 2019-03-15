import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { FindManyArgs } from './findMany';
import { RecordHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export default function updateMany(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type UpdateManyArgs<
  TSource,
  IndexedFields = { _id: MongoId }
> = RecordHelperArgs<TSource> & FindManyArgs<TSource, IndexedFields>;

export type UpdateManyRSource = { numAffected: number };
