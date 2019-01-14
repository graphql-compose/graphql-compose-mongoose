/* @flow */

import { Types } from 'mongoose';

const ObjectId = Types.ObjectId;

function _toMongoDottedObject(obj, target = {}, path = [], filter = false) {
  const objKeys = Object.keys(obj);

  /* eslint-disable */
  objKeys.forEach(key => {
     if (key.startsWith('$')) {
       if (path.length === 0) {
         target[key] = obj[key];
       } else {
         target[path.join('.')] = {
           ...target[path.join('.')],
           [key]: obj[key],
         };
       }
     } else if (Object(obj[key]) === obj[key] && !(obj[key] instanceof ObjectId)) {
       _toMongoDottedObject(obj[key], target, Array.isArray(obj) && filter ? path : path.concat(key), filter);
     } else {
       target[path.concat(key).join('.')] = obj[key];
     }
   });

   if (objKeys.length === 0) {
     target[path.join('.')] = obj;
   }

   return target;
   /* eslint-enable */
}

/**
 * Convert object to dotted-key/value pair
 * { a: { b: { c: 1 }}} ->  { 'a.b.c': 1 }
 * { a: { $in: [ 1, 2, 3] }} ->  { 'a': { $in: [ 1, 2, 3] } }
 * { a: { b: { $in: [ 1, 2, 3] }}} ->  { 'a.b': { $in: [ 1, 2, 3] } }
 * { a: [ { b: 1 }, { c: 2 }]} -> { 'a.0.b': 1, 'a.1.c': 2 }
 * Usage:
 *   var toMongoDottedObject(obj)
 *   or
 *   var target = {}; toMongoDottedObject(obj, target)
 *
 * @param {Object} obj source object
 * @param {Object} target target object
 * @param {Array} path path array (internal)
 */
export function toMongoDottedObject(
  obj: Object,
  target?: Object = {},
  path?: string[] = []
): { [dottedPath: string]: mixed } {
  return _toMongoDottedObject(obj, target, path);
}

/**
 * Convert object to dotted-key/value pair
 * { a: { b: { c: 1 }}} ->  { 'a.b.c': 1 }
 * { a: { $in: [ 1, 2, 3] }} ->  { 'a': { $in: [ 1, 2, 3] } }
 * { a: { b: { $in: [ 1, 2, 3] }}} ->  { 'a.b': { $in: [ 1, 2, 3] } }
 * { a: [ { b: 1 }, { c: 2 }]} -> { 'a.b': 1, 'a.c': 2 }
 * Usage:
 *   var toMongoFilterDottedObject(obj)
 *   or
 *   var target = {}; toMongoFilterDottedObject(obj, target)
 *
 * @param {Object} obj source object
 * @param {Object} target target object
 * @param {Array} path path array (internal)
 */
export function toMongoFilterDottedObject(
  obj: Object,
  target?: Object = {},
  path?: string[] = []
): { [dottedPath: string]: mixed } {
  return _toMongoDottedObject(obj, target, path, true);
}
