/* @flow */

import { isObject } from 'graphql-compose';
import toMongoDottedObject from './toMongoDottedObject';

export { toMongoDottedObject, isObject };

export function upperFirst(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
