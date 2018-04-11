/* @flow */

import { prepareCursorQuery } from '../prepareConnectionResolver';

let rawQuery;

describe('prepareConnectionResolver', () => {
  describe('prepareCursorQuery()', () => {
    describe('single index', () => {
      const cursorData = { a: 10 };
      const indexKeys = Object.keys(cursorData);

      it('asc order', () => {
        const indexData = { a: 1 };

        // for beforeCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$lt', '$gt');
        expect(rawQuery).toEqual({ a: { $lt: 10 } });

        // for afterCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$gt', '$lt');
        expect(rawQuery).toEqual({ a: { $gt: 10 } });
      });

      it('desc order', () => {
        const indexData = { a: -1 };

        // for beforeCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$lt', '$gt');
        expect(rawQuery).toEqual({ a: { $gt: 10 } });

        // for afterCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$gt', '$lt');
        expect(rawQuery).toEqual({ a: { $lt: 10 } });
      });
    });

    describe('compound index', () => {
      const cursorData = { a: 10, b: 100, c: 1000 };
      const indexKeys = Object.keys(cursorData);

      it('asc order', () => {
        const indexData = { a: 1, b: -1, c: 1 };

        // for beforeCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$lt', '$gt');
        expect(rawQuery).toEqual({
          $or: [
            { a: 10, b: 100, c: { $lt: 1000 } },
            { a: 10, b: { $gt: 100 } },
            { a: { $lt: 10 } },
          ],
        });

        // for afterCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$gt', '$lt');
        expect(rawQuery).toEqual({
          $or: [
            { a: 10, b: 100, c: { $gt: 1000 } },
            { a: 10, b: { $lt: 100 } },
            { a: { $gt: 10 } },
          ],
        });
      });

      it('desc order', () => {
        const indexData = { a: -1, b: 1, c: -1 };

        // for beforeCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$lt', '$gt');
        expect(rawQuery).toEqual({
          $or: [
            { a: 10, b: 100, c: { $gt: 1000 } },
            { a: 10, b: { $lt: 100 } },
            { a: { $gt: 10 } },
          ],
        });

        // for afterCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$gt', '$lt');
        expect(rawQuery).toEqual({
          $or: [
            { a: 10, b: 100, c: { $lt: 1000 } },
            { a: 10, b: { $gt: 100 } },
            { a: { $lt: 10 } },
          ],
        });
      });
    });
  });
});
