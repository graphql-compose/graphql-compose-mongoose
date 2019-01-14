/* @flow */

import { isObject, upperFirst } from 'graphql-compose';
import { toMongoDottedObject, toMongoFilterDottedObject } from './toMongoDottedObject';

export { toMongoDottedObject, toMongoFilterDottedObject, isObject, upperFirst };
export * from './getIndexesFromModel';
