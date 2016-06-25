/* @flow */
/* eslint-disable no-use-before-define */

import { GraphQLEnumType } from 'graphql/type';
import getIndexesFromModel from '../../utils/getIndexesFromModel';
import type {
  ExtendedResolveParams,
  GraphQLFieldConfigArgumentMap,
  MongooseModelT,
} from '../../definition';

export type sortHelperArgsGenOpts = {
  sortTypeName: string,
};

export const sortHelperArgsGen = (
  model: MongooseModelT,
  opts: sortHelperArgsGenOpts,
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
  sortTypeName: string,
  mongooseModel: MongooseModelT
): GraphQLEnumType {
  const fields = getIndexesFromModel(mongooseModel);

  const sortEnumValues = {};
  fields.forEach((sortData) => {
    const keys = Object.keys(sortData);
    let name = keys.join('__').toUpperCase().replace('.', '__');
    if (sortData[keys[0]] === 1) {
      name = `${name}_ASC`;
    } else if (sortData[keys[0]] === -1) {
      name = `${name}_DESC`;
    }
    sortEnumValues[name] = {
      name,
      value: sortData,
    };
  });

  const sortType = new GraphQLEnumType({
    name: sortTypeName,
    values: sortEnumValues,
  });

  return sortType;
}
