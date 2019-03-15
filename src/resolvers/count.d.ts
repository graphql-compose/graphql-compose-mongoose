import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../types/mongoid';
import { FilterHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export type CountArgs<TSource, IndexedFieldsMap = { _id: MongoId }> = {
  filter: FilterHelperArgs<TSource, IndexedFieldsMap>;
};

export type CountRSource = number;

export default function count(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;
