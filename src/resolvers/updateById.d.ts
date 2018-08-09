import { Resolver, TypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { GenResolverOpts } from './index';

export default function updateById(
  model: Model<any>,
  tc: TypeComposer<any>,
  opts?: GenResolverOpts): Resolver<any, any>;
