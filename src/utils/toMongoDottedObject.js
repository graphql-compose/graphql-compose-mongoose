/* @flow */

import { Types } from 'mongoose';

const ObjectId = Types.ObjectId;

/**
 * Convert object to dotted-key/value pair
 * { a: { b: { c: 1 }}} ->  { 'a.b.c': 1 }
 * { a: { $in: [ 1, 2, 3] }} ->  { 'a': { $in: [ 1, 2, 3] } }
 * { a: { b: { $in: [ 1, 2, 3] }}} ->  { 'a.b': { $in: [ 1, 2, 3] } }
 * Usage:
 *   var dotObject(obj)
 *   or
 *   var target = {}; dotObject(obj, target)
 *
 * @param {Object} obj source object
 * @param {Object} target target object
 * @param {Array} path path array (internal)
 */
export default function toMongoDottedObject(
  obj: Object,
  target?: Object = {},
  path?: string[] = []
): { [dottedPath: string]: mixed } {
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
       toMongoDottedObject(obj[key], target, path.concat(key));
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
