import { Document, Model } from 'mongoose';
import {
  DiscriminatorOptions,
  DiscriminatorTypeComposer,
} from './discriminators';

export function composeWithMongooseDiscriminators<
  TBaseModel extends Document = any,
  TContext = any
>(
  baseModel: Model<TBaseModel>,
  opts?: DiscriminatorOptions<TContext>,
): DiscriminatorTypeComposer<TBaseModel, TContext>;
