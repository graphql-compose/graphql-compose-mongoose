import { TypeComposerClass } from 'graphql-compose';
import { Model } from 'mongoose';

export function composeWithMongooseDiscriminators(
  baseModel: Model<any>,
  opts?: { [opts: string]: any }): TypeComposerClass<any>;
