import { expect } from 'chai';
import typeStorage from '../typeStorage';

describe('typeStorage', () => {
  it('should be instance of Map', () => {
    expect(typeStorage).instanceof(Map);
  });

  it('should work `get`, `set`, `has`, `clear` methods and `size` property', () => {
    typeStorage.clear();
    expect(typeStorage.size).to.equal(0);
    typeStorage.set(123, 567);
    expect(typeStorage.get(123)).to.equal(567);
    expect(typeStorage.has(123)).to.be.true;
    expect(typeStorage.size).to.equal(1);
    typeStorage.clear();
    expect(typeStorage.size).to.equal(0);
  });

  describe('getOrSet() method', () => {
    it('should return existed value', () => {
      typeStorage.clear();
      typeStorage.set(123, 456);
      expect(typeStorage.getOrSet(123, 'any')).to.equal(456);
    });

    it('should set new value and return it, if key not exists', () => {
      typeStorage.clear();
      expect(typeStorage.getOrSet(123, 456)).to.equal(456);
      expect(typeStorage.get(123)).to.equal(456);
    });

    it('should not set new value if it is empty', () => {
      typeStorage.clear();
      expect(typeStorage.getOrSet(123, null)).to.equal(null);
      expect(typeStorage.has(123)).to.be.false;
    });
  });
});
