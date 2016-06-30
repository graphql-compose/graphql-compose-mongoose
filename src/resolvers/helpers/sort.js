/* @flow */
/* eslint-disable no-use-before-define */

import { GraphQLEnumType } from 'graphql/type';
import getIndexesFromModel from '../../utils/getIndexesFromModel';
import type {
  ExtendedResolveParams,
  GraphQLFieldConfigArgumentMap,
  MongooseModelT,
  sortHelperArgsOpts,
} from '../../definition';


export const sortHelperArgs = (
  model: MongooseModelT,
  opts: sortHelperArgsOpts,
): GraphQLFieldConfigArgumentMap => {
  if (!opts.sortTypeName) {
    throw new Error('You should provide `sortTypeName` in options.');
  }

  const gqSortType = getSortTypeFromModel(opts.sortTypeName, model);

  return {
    sort: {
      name: 'sort',
      type: gqSortType,
    },
  };
};

export function sortHelper(resolveParams: ExtendedResolveParams): void {
  const sort = resolveParams && resolveParams.args && resolveParams.args.sort;
  if (sort && typeof sort === 'object' && Object.keys(sort).length > 0) {
    resolveParams.query = resolveParams.query.sort(sort); // eslint-disable-line
  }
}


export function getSortTypeFromModel(
  typeName: string,
  model: MongooseModelT
): GraphQLEnumType {
  const indexes = getIndexesFromModel(model);

  const sortEnumValues = {};
  indexes.forEach((indexData) => {
    const keys = Object.keys(indexData);
    let name = keys.join('__').toUpperCase().replace('.', '__');
    if (indexData[keys[0]] === 1) {
      name = `${name}_ASC`;
    } else if (indexData[keys[0]] === -1) {
      name = `${name}_DESC`;
    }
    sortEnumValues[name] = {
      name,
      value: indexData,
    };
  });

  const sortType = new GraphQLEnumType({
    name: typeName,
    values: sortEnumValues,
  });

  return sortType;
}
