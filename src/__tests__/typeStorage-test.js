/* @flow */

import typeStorage from '../typeStorage';

describe('typeStorage', () => {
  it('should be instance of Map', () => {
    expect(typeStorage).toBeInstanceOf(Map);
  });

  it('should work `get`, `set`, `has`, `clear` methods and `size` property', () => {
    typeStorage.clear();
    expect(typeStorage.size).toBe(0);
    typeStorage.set(123, 567);
    expect(typeStorage.get(123)).toBe(567);
    expect(typeStorage.has(123)).toBe(true);
    expect(typeStorage.size).toBe(1);
    typeStorage.clear();
    expect(typeStorage.size).toBe(0);
  });

  describe('getOrSet() method', () => {
    it('should return existed value', () => {
      typeStorage.clear();
      typeStorage.set(123, 456);
      expect(typeStorage.getOrSet(123, 'any')).toBe(456);
    });

    it('should set new value and return it, if key not exists', () => {
      typeStorage.clear();
      expect(typeStorage.getOrSet(123, 456)).toBe(456);
      expect(typeStorage.get(123)).toBe(456);
    });

    it('should not set new value if it is empty', () => {
      typeStorage.clear();
      expect(typeStorage.getOrSet(123, null)).toBe(null);
      expect(typeStorage.has(123)).toBe(false);
    });
  });
});
