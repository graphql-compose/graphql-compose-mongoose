import { Document, Model } from 'mongoose';
import {
  ComposeWithMongooseDiscriminatorsOpts,
  DiscriminatorTypeComposer,
} from './discriminators';

export * from './discriminators';

export function composeWithMongooseDiscriminators<
  TBaseModel extends Document = any,
  TContext = any
>(
  baseModel: Model<TBaseModel>,
  opts?: ComposeWithMongooseDiscriminatorsOpts<TContext>,
): DiscriminatorTypeComposer<TBaseModel, TContext>;
