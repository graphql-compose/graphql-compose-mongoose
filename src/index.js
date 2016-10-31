/* @flow */

import { composeWithMongoose } from './composeWithMongoose';
import typeStorage from './typeStorage';
import GraphQLMongoID from './types/mongoid';

export default composeWithMongoose;

export * from './fieldsConverter';
export {
  composeWithMongoose,
  typeStorage as mongooseTypeStorage,
  GraphQLMongoID,
};
