/* @flow */

import { toMongoDottedObject } from '../../utils/toMongoDottedObject';

describe('toMongoDottedObject()', () => {
  it('should handle operators using date object values when nested', () => {
    expect(toMongoDottedObject({ a: { dateField: { $gte: new Date(100) } } })).toEqual({
      'a.dateField': { $gte: new Date(100) },
    });
  });
});
