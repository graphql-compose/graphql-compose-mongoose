import { schemaComposer as globalSchemaComposer } from 'graphql-compose';
import type { Model } from 'mongoose';
import { ComposeWithMongooseDiscriminatorsOpts, DiscriminatorTypeComposer } from './discriminators';

export * from './discriminators';

export function composeWithMongooseDiscriminators<TSource = any, TContext = any>(
  baseModel: Model<any>,
  opts?: ComposeWithMongooseDiscriminatorsOpts<TContext>
): DiscriminatorTypeComposer<TSource, TContext> {
  const sc = opts?.schemaComposer || globalSchemaComposer;
  return DiscriminatorTypeComposer.createFromModel(baseModel, sc, opts);
}
