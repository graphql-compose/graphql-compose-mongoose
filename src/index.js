/* @flow */

import { composeWithMongoose } from './composeWithMongoose';
import typeStorage from './typeStorage';

export default composeWithMongoose;

export * from './fieldsConverter';
export {
  composeWithMongoose,
  typeStorage as mongooseTypeStorage,
};
