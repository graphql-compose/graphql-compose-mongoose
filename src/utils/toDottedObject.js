/**
 * Convert object to dotted-key/value pair
 *
 * Usage:
 *   var dotObject(obj)
 *
 *   or
 *
 *   var tgt = {}
 *   dotObject(obj, target)
 *
 * @param {Object} obj source object
 * @param {Object} target target object
 * @param {Array} path path array (internal)
 */
export function toDottedObject(obj, target, path) {
  /* eslint-disable */
  target = target || {};
  path = path || [];
  Object.keys(obj).forEach((key) => {
    if (Object(obj[key]) === obj[key]) {
      return dotObject(obj[key], target, path.concat(key));
    } else {
      target[path.concat(key).join('.')] = obj[key];
    }
  });
  return target;
  /* eslint-enable */
}
