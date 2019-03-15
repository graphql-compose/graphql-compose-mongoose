import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { GenResolverOpts } from './index';

export default function findById(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type FindByIdArgs = {
  _id: MongoId;
};

export type FindByIdRSource<TSource> = TSource;
