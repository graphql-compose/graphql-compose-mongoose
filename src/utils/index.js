/* @flow */
import toDottedObject from './toDottedObject';
import { isObject } from './is';

export {
  toDottedObject,
  isObject,
};

export function upperFirst(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
