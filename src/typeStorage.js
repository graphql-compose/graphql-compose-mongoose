/* @flow */

import { isFunction } from 'graphql-compose';

class TypeStorage extends Map<string, any> {
  // this `create` hack due TypeError:
  // Constructor Map requires 'new' at TypeStorage.Map (native)
  static create(array?: any[]): TypeStorage {
    const inst = new Map(array);
    // $FlowFixMe
    inst.__proto__ = TypeStorage.prototype; // eslint-disable-line
    return (inst: any);
  }

  getOrSet<T>(typeName: string, typeOrThunk: T | (() => T)): T {
    if (this.has(typeName)) {
      return (this.get(typeName): any);
    }

    const gqType: any = isFunction(typeOrThunk) ? typeOrThunk() : typeOrThunk;
    if (gqType) {
      this.set(typeName, gqType);
    }

    return gqType;
  }
}

const typeStorage = TypeStorage.create();
export default typeStorage;
