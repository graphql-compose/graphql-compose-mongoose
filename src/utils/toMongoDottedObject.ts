import { Types } from 'mongoose';
import { isObject } from 'graphql-compose';
import type { NestedAliasesMap } from '../resolvers/helpers';

const primitives = [Types.ObjectId, Date, String, Number, Boolean, Types.Decimal128];
const operatorsWithExpression = ['$or', '$and', '$not', '$nor'];

function isPrimitive(value: any) {
  return primitives.some((p) => value instanceof p);
}

function _toMongoDottedObject(
  obj: Record<string, any>,
  aliases: NestedAliasesMap | undefined,
  target: Record<string, any> = {},
  prefix: string = '',
  collapseArray = false
): { [dottedPath: string]: any } {
  if (((!isObject(obj) as any) && !Array.isArray(obj)) || isPrimitive(obj)) {
    if (prefix) target[prefix] = obj;
    return obj;
  }

  const objKeys = Object.keys(obj);
  objKeys.forEach((key) => {
    let newKey;
    if (aliases && aliases?.[key]) {
      const alias = aliases?.[key];
      let aliasValue;
      if (typeof alias === 'string') {
        aliasValue = alias;
      } else if (isObject(alias)) {
        aliasValue = alias?.__selfAlias;
      }
      newKey = aliasValue || key;
    } else {
      newKey = key;
    }

    if (prefix) {
      newKey = `${prefix}.${newKey}`;
    }

    if (key.startsWith('$')) {
      let val;
      if (operatorsWithExpression.includes(key)) {
        val = Array.isArray(obj[key])
          ? obj[key].map((v: any) => _toMongoDottedObject(v, aliases, {}, '', collapseArray))
          : _toMongoDottedObject(obj[key], aliases, {}, '', collapseArray);
      } else {
        val = obj[key];
      }
      if (!prefix) {
        target[key] = val;
      } else {
        target[prefix] = {
          ...target[prefix],
          [key]: val,
        };
      }
    } else if (Object(obj[key]) === obj[key] && !isPrimitive(obj[key])) {
      const subAliases = aliases?.[key];
      _toMongoDottedObject(
        obj[key],
        isObject(subAliases) ? subAliases : undefined,
        target,
        Array.isArray(obj) && collapseArray ? prefix : newKey,
        collapseArray
      );
    } else {
      target[newKey] = obj[key];
    }
  });

  if (objKeys.length === 0) {
    target[prefix] = obj;
  }

  return target;
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
 * @param {Object} aliases nested object with aliases (name which should be replaced)
 * @param {Object} target target object
 * @param {Array} path path array (internal)
 */
export function toMongoDottedObject(
  obj: Record<string, any>,
  aliases?: NestedAliasesMap,
  target: Record<string, any> = {}
): { [dottedPath: string]: any } {
  return _toMongoDottedObject(obj, aliases, target, '');
}

/**
 * Convert object to dotted-key/value pair
 * { a: { b: { c: 1 }}} ->  { 'a.b.c': 1 }
 * { a: { $in: [ 1, 2, 3] }} ->  { 'a': { $in: [ 1, 2, 3] } }
 * { a: { b: { $in: [ 1, 2, 3] }}} ->  { 'a.b': { $in: [ 1, 2, 3] } }
 * { a: [ { b: 1 }, { c: 2 }]} -> { 'a.b': 1, 'a.c': 2 }
 * Usage:
 *   toMongoFilterDottedObject(obj)
 *   or
 *   toMongoFilterDottedObject(obj, aliases)
 *
 * @param {Object} obj source object
 * @param {Object} target target object
 * @param {Array} path path array (internal)
 */
export function toMongoFilterDottedObject(
  obj: Record<string, any>,
  aliases?: NestedAliasesMap,
  target: Record<string, any> = {},
  prefix: string = ''
): { [dottedPath: string]: any } {
  return _toMongoDottedObject(obj, aliases, target, prefix, true);
}
