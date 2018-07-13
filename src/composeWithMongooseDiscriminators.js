/* @flow */

import { Model } from 'mongoose';
import { Options, DiscriminatorTypeComposer } from './discriminators';

export function composeWithMongooseDiscriminators(
  baseModel: Model,
  opts?: Options
): DiscriminatorTypeComposer {
  return new DiscriminatorTypeComposer(baseModel, opts);
}
