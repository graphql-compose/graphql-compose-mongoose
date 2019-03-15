/* @flow */

import { schemaComposer } from 'graphql-compose';
import type { Model } from 'mongoose';
import { type DiscriminatorOptions, DiscriminatorTypeComposer } from './discriminators';

export function composeWithMongooseDiscriminators(
  baseModel: Class<Model>,
  opts?: DiscriminatorOptions
): DiscriminatorTypeComposer<any, any> {
  const sc = (opts ? opts.schemaComposer : null) || schemaComposer;
  return DiscriminatorTypeComposer.createFromModel(baseModel, sc, opts);
}
