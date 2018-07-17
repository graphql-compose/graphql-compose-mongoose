/* @flow */
/* eslint-disable no-use-before-define, no-param-reassign, global-require */

import type { MongooseModel } from 'mongoose';
import type { ConnectionSortMapOpts as _ConnectionSortMapOpts } from 'graphql-compose-connection';
import type { Resolver, TypeComposer } from 'graphql-compose';
import {
  getUniqueIndexes,
  extendByReversedIndexes,
  type IndexT,
} from '../utils/getIndexesFromModel';

export type ConnectionSortMapOpts = _ConnectionSortMapOpts;

export default function connection(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: ConnectionSortMapOpts
): ?Resolver {
  try {
    require.resolve('graphql-compose-connection');
  } catch (e) {
    return undefined;
  }
  const prepareConnectionResolver = require('graphql-compose-connection').prepareConnectionResolver;

  if (!prepareConnectionResolver) {
    throw new Error(
      'You should update `graphql-compose-connection` package till 3.2.0 version or above'
    );
  }

  const uniqueIndexes = extendByReversedIndexes(getUniqueIndexes(model), {
    reversedFirst: true,
  });
  const sortConfigs = {};
  uniqueIndexes.forEach(indexData => {
    const keys = Object.keys(indexData);
    let name = keys
      .join('__')
      .toUpperCase()
      .replace(/[^_a-zA-Z0-9]/i, '__');
    if (indexData[keys[0]] === 1) {
      name = `${name}_ASC`;
    } else if (indexData[keys[0]] === -1) {
      name = `${name}_DESC`;
    }
    sortConfigs[name] = {
      value: indexData,
      cursorFields: keys,
      beforeCursorQuery: (rawQuery, cursorData) => {
        prepareCursorQuery(rawQuery, cursorData, keys, indexData, '$lt', '$gt');
      },
      afterCursorQuery: (rawQuery, cursorData) => {
        prepareCursorQuery(rawQuery, cursorData, keys, indexData, '$gt', '$lt');
      },
    };
  });

  return prepareConnectionResolver(tc, {
    findResolverName: 'findMany',
    countResolverName: 'count',
    sort: {
      ...sortConfigs,
      ...opts,
    },
  });
}

export function prepareCursorQuery(
  rawQuery: Object,
  cursorData: Object,
  indexKeys: Array<string>,
  indexData: IndexT,
  nextOper: '$gt' | '$lt',
  prevOper: '$lt' | '$gt'
): void {
  if (indexKeys.length === 1) {
    // When single index { a: 1 }, then just add to one criteria to the query:
    // rawQuery.a = { $gt|$lt: cursorValue } - for next|prev record
    const k = indexKeys[0];
    if (!rawQuery[k]) rawQuery[k] = {};
    if (indexData[k] === 1) {
      rawQuery[k][nextOper] = cursorData[k];
    } else {
      rawQuery[k][prevOper] = cursorData[k];
    }
  } else {
    // When compound index {a: 1, b: -1, c: 1 } then we should add OR criterias to the query:
    // rawQuery.$or = [
    //   { a: cursorValueA, b: cursorValueB, c: { $gt|$lt: cursorValueC } },
    //   { a: cursorValueA, b: { $gt|$lt: cursorValueB } },
    //   { a: { $gt|$lt: cursorValueA } },
    // ]
    const orCriteries = [];
    for (let i = indexKeys.length - 1; i >= 0; i--) {
      const criteria = {};
      indexKeys.forEach((k, ii) => {
        if (ii < i) {
          criteria[k] = cursorData[k];
        } else if (ii === i) {
          if (indexData[k] === 1) {
            criteria[k] = { [nextOper]: cursorData[k] };
          } else {
            criteria[k] = { [prevOper]: cursorData[k] };
          }
        }
      });
      orCriteries.push(criteria);
    }
    rawQuery.$or = orCriteries;
  }
}
