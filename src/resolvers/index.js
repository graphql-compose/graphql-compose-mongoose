/* @flow */

import findById from './findById';
import findByIds from './findByIds';
import findOne from './findOne';
import findMany from './findMany';

import updateById from './updateById';
import updateOne from './updateOne';
import updateMany from './updateMany';

import removeById from './removeById';
import removeOne from './removeOne';
import removeMany from './removeMany';

import createOne from './createOne';
import count from './count';

export {
  findById,
  findByIds,
  findOne,
  findMany,
  updateById,
  updateOne,
  updateMany,
  removeById,
  removeOne,
  removeMany,
  createOne,
  count,
};

export function getAvailableNames(): string[] {
  return [
    'findById',
    'findByIds',
    'findOne',
    'findMany',
    'updateById',
    'updateOne',
    'updateMany',
    'removeById',
    'removeOne',
    'removeMany',
    'createOne',
    'count',
  ];
}
