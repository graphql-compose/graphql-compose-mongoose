/* @flow */

import { composeWithMongoose } from './composeWithMongoose';
import { composeWithMongooseDiscriminators } from './composeWithMongooseDiscriminators';
import GraphQLMongoID from './types/mongoid';

export default composeWithMongoose;

export * from './fieldsConverter';
export * from './discriminators';
export { composeWithMongoose, composeWithMongooseDiscriminators, GraphQLMongoID };
