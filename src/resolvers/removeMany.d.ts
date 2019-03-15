import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { FilterHelperArgs } from './helpers';
import { GenResolverOpts } from './index';

export default function removeById(
  model: Model<any>,
  tc: ObjectTypeComposer<any>,
  opts?: GenResolverOpts,
): Resolver<any, any>;

export type RemoveManyArgs<TSource = any> = {
  filter: FilterHelperArgs<TSource>;
};

export type RemoveManyRSource = {
  numAffected: number;
};
