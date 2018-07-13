/* @flow */

import { Model } from 'mongoose';
import { type Options, DiscriminatorTypeComposer } from './discriminators';

export function composeWithMongooseDiscriminators(
  baseModel: Model,
  opts?: Options
): DiscriminatorTypeComposer {
  return new DiscriminatorTypeComposer(baseModel, opts);
}
