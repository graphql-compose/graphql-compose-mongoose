/* @flow */
/* eslint-disable no-use-before-define */

import type { TypeComposer, ComposeFieldConfigArgumentMap } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import GraphQLMongoID from '../../types/mongoid';
import { isObject, toMongoDottedObject, getIndexedFieldNamesForGraphQL } from '../../utils';
import type { ExtendedResolveParams } from '../index';
import {
  type FilterOperatorsOpts,
  addFilterOperators,
  processFilterOperators,
} from './filterOperators';

export type FilterHelperArgsOpts = {
  filterTypeName?: string,
  isRequired?: boolean,
  onlyIndexed?: boolean,
  requiredFields?: string | string[],
  operators?: FilterOperatorsOpts | false,
  removeFields?: string | string[],
};

// for merging, discriminators merge-able only
export const getFilterHelperArgOptsMap = () => ({
  // filterTypeName? : 'string'
  isRequired: 'boolean',
  onlyIndexed: 'boolean',
  requiredFields: ['string', 'string[]'],
  operators: ['FilterOperatorsOptsMap', 'boolean'],
  removeFields: ['string', 'string[]'],
});

export const filterHelperArgs = (
  typeComposer: TypeComposer,
  model: MongooseModel,
  opts?: FilterHelperArgsOpts
): ComposeFieldConfigArgumentMap => {
  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('First arg for filterHelperArgs() should be instance of TypeComposer.');
  }

  if (!model || !model.modelName || !model.schema) {
    throw new Error('Second arg for filterHelperArgs() should be instance of MongooseModel.');
  }

  if (!opts || !opts.filterTypeName) {
    throw new Error('You should provide non-empty `filterTypeName` in options.');
  }

  const removeFields = [];
  if (opts.removeFields) {
    if (Array.isArray(opts.removeFields)) {
      removeFields.push(...opts.removeFields);
    } else {
      removeFields.push(opts.removeFields);
    }
  }

  if (opts.onlyIndexed) {
    const indexedFieldNames = getIndexedFieldNamesForGraphQL(model);
    Object.keys(typeComposer.getFields()).forEach(fieldName => {
      if (indexedFieldNames.indexOf(fieldName) === -1) {
        removeFields.push(fieldName);
      }
    });
  }

  const filterTypeName: string = opts.filterTypeName;
  const itc = typeComposer.getInputTypeComposer().clone(filterTypeName);

  itc.addFields({
    _ids: [GraphQLMongoID],
  });

  itc.removeField(removeFields);

  if (opts.requiredFields) {
    itc.makeRequired(opts.requiredFields);
  }

  if (itc.getFieldNames().length === 0) {
    return {};
  }

  addFilterOperators(itc, model, opts);

  return {
    filter: {
      type: opts.isRequired ? itc.getTypeNonNull() : itc.getType(),
      description: opts.onlyIndexed ? 'Filter only by indexed fields' : 'Filter by fields',
    },
  };
};

export function filterHelper(resolveParams: ExtendedResolveParams): void {
  const filter = resolveParams.args && resolveParams.args.filter;
  if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
    const modelFields = resolveParams.query.schema.paths;

    const { _ids, ...filterFields } = filter;
    if (_ids && Array.isArray(_ids)) {
      // eslint-disable-next-line
      resolveParams.query = resolveParams.query.where({ _id: { $in: _ids } });
    }

    const clearedFilter = {};
    Object.keys(filterFields).forEach(key => {
      if (modelFields[key]) {
        clearedFilter[key] = filterFields[key];
      }
    });
    if (Object.keys(clearedFilter).length > 0) {
      // eslint-disable-next-line
      resolveParams.query = resolveParams.query.where(toMongoDottedObject(clearedFilter));
    }

    processFilterOperators(filter, resolveParams);
  }

  if (isObject(resolveParams.rawQuery)) {
    // eslint-disable-next-line
    resolveParams.query = resolveParams.query.where(resolveParams.rawQuery);
  }
}
