import toMongoDottedObject from '../toMongoDottedObject';

describe('toMongoDottedObject()', () => {
  it('should dot nested objects', () => {
    expect(toMongoDottedObject({ a: { b: { c: 1 } } })).toEqual({ 'a.b.c': 1 });
  });

  it('should not dot query operators started with $', () => {
    expect(toMongoDottedObject({ a: { $in: [1, 2, 3] } })).toEqual({
      a: { $in: [1, 2, 3] },
    });
    expect(toMongoDottedObject({ a: { b: { $in: [1, 2, 3] } } })).toEqual({
      'a.b': { $in: [1, 2, 3] },
    });
  });

  it('should mix query operators started with $', () => {
    expect(
      toMongoDottedObject({ a: { $in: [1, 2, 3], $exists: true } }),
    ).toEqual({
      a: { $in: [1, 2, 3], $exists: true },
    });
  });

  it('should not mix query operators started with $ and regular fields', () => {
    expect(toMongoDottedObject({ a: { $exists: true, b: 3 } })).toEqual({
      a: { $exists: true },
      'a.b': 3,
    });
  });
});
