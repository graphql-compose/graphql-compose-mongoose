/* @flow */

import { isFunction } from 'graphql-compose';

class TypeStorage extends Map {
  // this `create` hack due TypeError:
  // Constructor Map requires 'new' at TypeStorage.Map (native)
  static create(array?: any[]): TypeStorage {
    const inst = new Map(array);
    // $FlowFixMe
    inst.__proto__ = TypeStorage.prototype; // eslint-disable-line
    // $FlowFixMe
    return inst;
  }

  getOrSet<T>(typeName: string, typeOrThunk: T | (() => T)): ?T {
    if (this.has(typeName)) {
      // $FlowFixMe
      return this.get(typeName);
    }

    // $FlowFixMe
    const gqType: T = isFunction(typeOrThunk) ? typeOrThunk() : typeOrThunk;
    if (gqType) {
      this.set(typeName, gqType);
    }

    return gqType;
  }
}

const typeStorage = TypeStorage.create();
export default typeStorage;
