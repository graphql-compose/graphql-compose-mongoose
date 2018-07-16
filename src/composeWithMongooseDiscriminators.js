/* @flow */

import { Model } from 'mongoose';
import { type Options, DiscriminatorTypeComposer } from './discriminators';

export function composeWithMongooseDiscriminators(
  baseModel: Model,
  opts?: Options
): DiscriminatorTypeComposer<any> {
  return DiscriminatorTypeComposer.createFromModel(baseModel, opts);
}
