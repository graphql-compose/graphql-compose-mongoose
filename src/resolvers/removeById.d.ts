import { Resolver, TypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { GenResolverOpts } from './index';

export default function removeById(
  model: Model<any>,
  tc: TypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type RemoveByIdArgs = {
  _id: MongoId;
};

export type RemoveByIdRSource<TSource> = {
  recordId: MongoId;
  record: TSource;
};
