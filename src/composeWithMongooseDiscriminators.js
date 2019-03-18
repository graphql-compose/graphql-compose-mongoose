/* @flow */

import { schemaComposer as globalSchemaComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import {
  type ComposeWithMongooseDiscriminatorsOpts,
  DiscriminatorTypeComposer,
} from './discriminators';

export * from './discriminators';

export function composeWithMongooseDiscriminators<TSource, TContext>(
  baseModel: Class<TSource>, // === MongooseModel,
  opts?: ComposeWithMongooseDiscriminatorsOpts<TContext>
): DiscriminatorTypeComposer<TSource, TContext> {
  const m: MongooseModel = (baseModel: any);
  const sc = (opts ? opts.schemaComposer : null) || globalSchemaComposer;
  return DiscriminatorTypeComposer.createFromModel(m, sc, opts);
}
