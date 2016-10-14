/* @flow */
/* eslint-disable no-use-before-define */

import { GraphQLEnumType } from 'graphql';
import getIndexesFromModel from '../../utils/getIndexesFromModel';
import typeStorage from '../../typeStorage';
import type {
  ExtendedResolveParams,
  GraphQLFieldConfigArgumentMap,
  MongooseModelT,
  sortHelperArgsOpts,
  ObjectMap,
} from '../../definition';


export const sortHelperArgs = (
  model: MongooseModelT,
  opts: sortHelperArgsOpts
): GraphQLFieldConfigArgumentMap => {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for sortHelperArgs() should be instance of Mongoose Model.'
    );
  }

  if (!opts || !opts.sortTypeName) {
    throw new Error('You should provide non-empty `sortTypeName` in options for sortHelperArgs().');
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
  const indexes = getIndexesFromModelWithReverse(model);

  const sortEnumValues = {};
  indexes.forEach((indexData) => {
    const keys = Object.keys(indexData);
    let name = keys.join('__').toUpperCase().replace(/[^_a-zA-Z0-9]/i, '__');
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

  return typeStorage.getOrSet(
    typeName,
    new GraphQLEnumType({
      name: typeName,
      values: sortEnumValues,
    })
  );
}


export function getIndexesFromModelWithReverse(model: MongooseModelT) {
  const indexes = getIndexesFromModel(model);
  const result: ObjectMap[] = [];

  indexes.forEach((indexObj) => {
    let hasSpecificIndex = false;
    // https://docs.mongodb.org/manual/tutorial/sort-results-with-indexes/#sort-on-multiple-fields
    const reversedIndexObj = Object.assign({}, indexObj);
    Object.keys(reversedIndexObj).forEach((f) => {
      if (reversedIndexObj[f] === 1) reversedIndexObj[f] = -1;
      else if (reversedIndexObj[f] === -1) reversedIndexObj[f] = 1;
      else hasSpecificIndex = true;
    });

    result.push(indexObj);
    if (!hasSpecificIndex) {
      result.push(reversedIndexObj);
    }
  });

  return result;
}
