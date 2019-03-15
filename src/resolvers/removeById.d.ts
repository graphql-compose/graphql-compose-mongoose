import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { GenResolverOpts } from './index';

export default function removeById(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type RemoveByIdArgs = {
  _id: MongoId;
};

export type RemoveByIdRSource<TSource> = {
  recordId: MongoId;
  record: TSource;
};
