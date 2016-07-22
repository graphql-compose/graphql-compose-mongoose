/* @flow */

class TypeStorage extends Map {
  getOrSet<T>(typeName: string, gqType: T): T {
    if (this.has(typeName)) {
      // $FlowFixMe
      return this.get(typeName);
    }

    if (gqType) {
      this.set(typeName, gqType);
    }

    return gqType;
  }
}

const typeStorage = new TypeStorage();
export default typeStorage;
