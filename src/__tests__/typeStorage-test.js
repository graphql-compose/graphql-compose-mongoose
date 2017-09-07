/* @flow */

import typeStorage from '../typeStorage';

describe('typeStorage', () => {
  it('should be instance of Map', () => {
    expect(typeStorage).toBeInstanceOf(Map);
  });

  it('should work `get`, `set`, `has`, `clear` methods and `size` property', () => {
    typeStorage.clear();
    expect(typeStorage.size).toBe(0);
    typeStorage.set('Type', 567);
    expect(typeStorage.get('Type')).toBe(567);
    expect(typeStorage.has('Type')).toBe(true);
    expect(typeStorage.size).toBe(1);
    typeStorage.clear();
    expect(typeStorage.size).toBe(0);
  });

  describe('getOrSet() method', () => {
    it('should return existed value', () => {
      typeStorage.clear();
      typeStorage.set('Type1', 456);
      expect(typeStorage.getOrSet('Type1', 'any')).toBe(456);
    });

    it('should set new value and return it, if key not exists', () => {
      typeStorage.clear();
      expect(typeStorage.getOrSet('Type2', 456)).toBe(456);
      expect(typeStorage.get('Type2')).toBe(456);
    });

    it('should not set new value if it is empty', () => {
      typeStorage.clear();
      expect(typeStorage.getOrSet('Type3', null)).toBe(null);
      expect(typeStorage.has('Type3')).toBe(false);
    });
  });
});
