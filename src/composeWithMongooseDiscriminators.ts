import { schemaComposer as globalSchemaComposer } from 'graphql-compose';
import type { Model } from 'mongoose';
import { ComposeWithMongooseDiscriminatorsOpts, DiscriminatorTypeComposer } from './discriminators';

export * from './discriminators';

export function composeWithMongooseDiscriminators<TDoc, TContext = any>(
  baseModel: Model<TDoc>,
  opts?: ComposeWithMongooseDiscriminatorsOpts<TContext>
): DiscriminatorTypeComposer<TDoc, TContext> {
  const sc = opts?.schemaComposer || globalSchemaComposer;
  return DiscriminatorTypeComposer.createFromModel(baseModel, sc, opts);
}
