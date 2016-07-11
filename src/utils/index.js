import toDottedObject from './toDottedObject';

export {
  toDottedObject,
};

export function upperFirst(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function isObject(value: mixed): boolean {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}
