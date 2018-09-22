import { Resolver, TypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { RecordHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export type CreateOneArgs<TSource> = RecordHelperArgs<TSource>;
export type CreateOneRSource<TSource> = {
  recordId: MongoId;
  record: TSource;
};

export default function createOne(
  model: Model<any>,
  tc: TypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;
