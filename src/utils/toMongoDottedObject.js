/* @flow */

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
  /* eslint-disable */
   Object.keys(obj).forEach(key => {
     if (key.startsWith('$')) {
       target[path.join('.')] = { 
         ...target[path.join('.')],
         [key]: obj[key],
       };
     } else if (Object(obj[key]) === obj[key]) {
       toMongoDottedObject(obj[key], target, path.concat(key));
     } else {
       target[path.concat(key).join('.')] = obj[key];
     }
   });
   return target;
   /* eslint-enable */
}
