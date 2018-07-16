/* @flow */

import type { Model } from 'mongoose';
import { type Options, DiscriminatorTypeComposer } from './discriminators';

export function composeWithMongooseDiscriminators(
  baseModel: Class<Model>,
  opts?: Options
): DiscriminatorTypeComposer<any> {
  return DiscriminatorTypeComposer.createFromModel(baseModel, opts);
}
