import { Resolver, TypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { GenResolverOpts } from './index';

export default function findById(
  model: Model<any>,
  tc: TypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type FindByIdArgs = {
  _id: MongoId;
};

export type FindByIdRSource<TSource> = TSource;
