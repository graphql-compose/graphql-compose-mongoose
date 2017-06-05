/* @flow */
import toMongoDottedObject from './toMongoDottedObject';
import { isObject } from './is';

export { toMongoDottedObject, isObject };

export function upperFirst(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
