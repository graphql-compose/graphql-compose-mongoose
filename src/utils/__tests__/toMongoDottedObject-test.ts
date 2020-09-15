import { Types } from 'mongoose';
import { toMongoDottedObject, toMongoFilterDottedObject } from '../toMongoDottedObject';

describe('toMongoDottedObject()', () => {
  it('should dot nested objects', () => {
    expect(toMongoDottedObject({ a: { b: { c: 1 } } })).toEqual({ 'a.b.c': 1 });
  });

  it('should dot nested objects with aliases', () => {
    expect(toMongoDottedObject({ a: { b: { c: 1 } } }, { a: { b: 'alias' } })).toEqual({
      'a.alias.c': 1,
    });
    expect(
      toMongoDottedObject(
        { a: { b: { c: 1 } } },
        {
          a: { __selfAlias: 'aaaaa', b: { __selfAlias: 'bbbbb', c: 'ccccc' } },
        }
      )
    ).toEqual({ 'aaaaa.bbbbb.ccccc': 1 });
  });

  it('should not dot query operators started with $', () => {
    expect(toMongoDottedObject({ a: { $in: [1, 2, 3] } })).toEqual({
      a: { $in: [1, 2, 3] },
    });
    expect(toMongoDottedObject({ a: { b: { $in: [1, 2, 3] } } })).toEqual({
      'a.b': { $in: [1, 2, 3] },
    });
    expect(toMongoDottedObject({ $or: [{ age: 1 }, { age: 2 }] })).toEqual({
      $or: [{ age: 1 }, { age: 2 }],
    });
  });

  it('should mix query operators started with $', () => {
    expect(toMongoDottedObject({ a: { $in: [1, 2, 3], $exists: true } })).toEqual({
      a: { $in: [1, 2, 3], $exists: true },
    });
  });

  it('should not mix query operators started with $ and regular fields', () => {
    expect(toMongoDottedObject({ a: { $exists: true, b: 3 } })).toEqual({
      a: { $exists: true },
      'a.b': 3,
    });

    expect(toMongoDottedObject({ a: { $exists: true, b: 3 } }, { a: 'alias' })).toEqual({
      alias: { $exists: true },
      'alias.b': 3,
    });
  });

  it('should handle date object values as scalars', () => {
    expect(toMongoDottedObject({ dateField: new Date(100) })).toEqual({
      dateField: new Date(100),
    });
  });

  it('should handle date object values when nested', () => {
    expect(toMongoDottedObject({ a: { dateField: new Date(100) } })).toEqual({
      'a.dateField': new Date(100),
    });
  });

  it('should keep BSON ObjectId untouched', () => {
    const id = new Types.ObjectId();
    expect(toMongoDottedObject({ a: { someField: id } })).toEqual({
      'a.someField': id,
    });
  });

  it('should dot array without index', () => {
    expect(toMongoDottedObject({ a: [{ b: 1 }, { c: 2 }] })).toEqual({ 'a.0.b': 1, 'a.1.c': 2 });
    expect(toMongoDottedObject({ a: [{ b: 1 }, { c: 2 }] }, { a: 'alias' })).toEqual({
      'alias.0.b': 1,
      'alias.1.c': 2,
    });
  });
});

describe('toMongoFilterDottedObject()', () => {
  it('should dot nested objects', () => {
    expect(toMongoFilterDottedObject({ a: { b: { c: 1 } } })).toEqual({ 'a.b.c': 1 });
  });

  it('should dot nested objects with aliases', () => {
    expect(toMongoFilterDottedObject({ a: { b: { c: 1 } } }, { a: { b: 'alias' } })).toEqual({
      'a.alias.c': 1,
    });
    expect(
      toMongoFilterDottedObject(
        { a: { b: { c: 1 } } },
        {
          a: { __selfAlias: 'aaaaa', b: { __selfAlias: 'bbbbb', c: 'ccccc' } },
        }
      )
    ).toEqual({ 'aaaaa.bbbbb.ccccc': 1 });
  });

  it('should not dot query operators started with $', () => {
    expect(toMongoFilterDottedObject({ a: { $in: [1, 2, 3] } })).toEqual({
      a: { $in: [1, 2, 3] },
    });
    expect(toMongoFilterDottedObject({ a: { b: { $in: [1, 2, 3] } } })).toEqual({
      'a.b': { $in: [1, 2, 3] },
    });
    expect(toMongoFilterDottedObject({ $or: [{ age: 1 }, { age: 2 }] })).toEqual({
      $or: [{ age: 1 }, { age: 2 }],
    });
  });

  it('should mix query operators started with $', () => {
    expect(toMongoFilterDottedObject({ a: { $in: [1, 2, 3], $exists: true } })).toEqual({
      a: { $in: [1, 2, 3], $exists: true },
    });
  });

  it('should not mix query operators started with $ and regular fields', () => {
    expect(toMongoFilterDottedObject({ a: { $exists: true, b: 3 } })).toEqual({
      a: { $exists: true },
      'a.b': 3,
    });

    expect(toMongoFilterDottedObject({ a: { $exists: true, b: 3 } }, { a: 'alias' })).toEqual({
      alias: { $exists: true },
      'alias.b': 3,
    });
  });

  it('should dotify internals of logical operators: $or $and $not $nor', () => {
    expect(
      toMongoFilterDottedObject(
        {
          $and: [{ a: { b: 1 } }, { c: [1, 2] }],
          $or: [{ a: { b: 1 } }, { c: [1, 2] }],
          some: {
            me: {
              $nor: [{ a: { b: 1 } }, { c: [1, 2] }],
              $not: { a: { b: 1 } },
            },
          },
        },
        {
          a: 'alias',
          some: {
            me: {
              c: 'ccccc',
            },
          },
        }
      )
    ).toEqual({
      $and: [{ 'alias.b': 1 }, { 'c.0': 1, 'c.1': 2 }],
      $or: [{ 'alias.b': 1 }, { 'c.0': 1, 'c.1': 2 }],
      'some.me': { $nor: [{ 'a.b': 1 }, { 'ccccc.0': 1, 'ccccc.1': 2 }], $not: { 'a.b': 1 } },
    });
  });

  it('should keep $geometry as is', () => {
    expect(
      toMongoFilterDottedObject({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [10.3222671, 36.88911649999999] },
            $maxDistance: 50000,
          },
        },
      })
    ).toEqual({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [10.3222671, 36.88911649999999] },
          $maxDistance: 50000,
        },
      },
    });
  });

  it('should handle date object values as scalars', () => {
    expect(toMongoFilterDottedObject({ dateField: new Date(100) })).toEqual({
      dateField: new Date(100),
    });
  });

  it('should handle date object values when nested', () => {
    expect(toMongoFilterDottedObject({ a: { dateField: new Date(100) } })).toEqual({
      'a.dateField': new Date(100),
    });
  });

  it('should keep BSON ObjectId untouched', () => {
    const id = new Types.ObjectId();
    expect(toMongoFilterDottedObject({ a: { someField: id } })).toEqual({
      'a.someField': id,
    });
    expect(toMongoFilterDottedObject({ a: { someField: id } }, { a: 'alias' })).toEqual({
      'alias.someField': id,
    });
  });

  it('should dot array without index', () => {
    expect(toMongoFilterDottedObject({ a: [{ b: 1 }, { c: 2 }] })).toEqual({ 'a.b': 1, 'a.c': 2 });
  });
});
