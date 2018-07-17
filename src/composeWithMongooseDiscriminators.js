/* @flow */

import type { Model } from 'mongoose';
import { type DiscriminatorOptions, DiscriminatorTypeComposer } from './discriminators';

export function composeWithMongooseDiscriminators(
  baseModel: Class<Model>,
  opts?: DiscriminatorOptions
): DiscriminatorTypeComposer<any> {
  return DiscriminatorTypeComposer.createFromModel(baseModel, opts);
}
