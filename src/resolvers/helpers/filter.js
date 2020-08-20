/* @flow */
/* eslint-disable no-use-before-define */

import {
  ObjectTypeComposer,
  type ObjectTypeComposerArgumentConfigMapDefinition,
} from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import GraphQLMongoID from '../../types/mongoid';
import { isObject, toMongoFilterDottedObject, getIndexedFieldNamesForGraphQL } from '../../utils';
import type { ExtendedResolveParams } from '../index';
import {
  type FilterOperatorsOpts,
  addFilterOperators,
  processFilterOperators,
} from './filterOperators';
import type { AliasesMap } from './aliases';

export type FilterHelperArgsOpts = {
  filterTypeName?: string,
  isRequired?: boolean,
  onlyIndexed?: boolean,
  // a tree of operators, null or false will allow all fields available in the schema (respecting on onlyIndexed)
  operators?: any,
};

// for merging, discriminators merge-able only
export const getFilterHelperArgOptsMap = () => ({
  filterTypeName: 'string',
  isRequired: 'boolean',
  onlyIndexed: 'boolean',
  // If operators are a tree `removeFields` won't be needed, as any fields you wouldn't want can just be left out of the..
  // tree, this could be an allow and/or reject tree
  operators: ['FilterOperatorsOptsMap', 'boolean'],
});

export const filterHelperArgs = (
  typeComposer: ObjectTypeComposer<any, any>,
  model: MongooseModel,
  opts?: FilterHelperArgsOpts
): ObjectTypeComposerArgumentConfigMapDefinition<> => {
  if (!(typeComposer instanceof ObjectTypeComposer)) {
    throw new Error('First arg for filterHelperArgs() should be instance of ObjectTypeComposer.');
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
    Object.keys(typeComposer.getFields()).forEach((fieldName) => {
      if (indexedFieldNames.indexOf(fieldName) === -1) {
        removeFields.push(fieldName);
      }
    });
  }

  const filterTypeName: string = opts.filterTypeName;
  const itc = typeComposer.getInputTypeComposer().clone(filterTypeName);

  itc.makeFieldNullable(itc.getFieldNames());

  itc.removeField(removeFields);

  if (opts.requiredFields) {
    itc.makeFieldNonNull(opts.requiredFields);
  }

  if (itc.getFieldNames().length === 0) {
    return {};
  }

  addFilterOperators(itc, model, opts);

  return {
    filter: {
      type: opts.isRequired ? itc.getTypeNonNull() : itc,
      description: opts.onlyIndexed ? 'Filter only by indexed fields' : 'Filter by fields',
    },
  };
};

export function filterHelper(
  resolveParams: ExtendedResolveParams,
  aliases: AliasesMap | false
): void {
  const filter = resolveParams.args && resolveParams.args.filter;
  if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
    const modelFields = resolveParams.query.schema.paths;

    const { _ids, ...filterFields } = filter;
    if (_ids && Array.isArray(_ids)) {
      // eslint-disable-next-line
      resolveParams.query = resolveParams.query.where({ _id: { $in: _ids } });
    }
    processFilterOperators(filterFields);

    // eslint-disable-next-line
    resolveParams.query = resolveParams.query.where(
      toMongoFilterDottedObject(resolveParams.query.model.translateAliases(filterFields))
    );
  }

  if (isObject(resolveParams.rawQuery)) {
    // eslint-disable-next-line
    resolveParams.query = resolveParams.query.where(resolveParams.rawQuery);
  }
}
