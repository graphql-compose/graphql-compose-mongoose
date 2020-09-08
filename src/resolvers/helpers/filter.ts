/* eslint-disable no-use-before-define */

import { ObjectTypeComposer, ObjectTypeComposerArgumentConfigMap } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { isObject, toMongoFilterDottedObject, getIndexedFieldNamesForGraphQL } from '../../utils';
import type { ExtendedResolveParams } from '../index';
import {
  FieldsOperatorsConfig,
  addFilterOperators,
  processFilterOperators,
} from './filterOperators';
import type { AliasesMap } from './aliases';
import { makeFieldsRecursiveNullable } from '../../utils/makeFieldsRecursiveNullable';

export type FilterHelperArgsOpts = {
  prefix?: string;
  suffix?: string;
  baseTypeName?: string;
  isRequired?: boolean;
  onlyIndexed?: boolean;
  requiredFields?: string | string[];
  operators?: FieldsOperatorsConfig | false;
  removeFields?: string | string[];
};

// for merging, discriminators merge-able only
export const getFilterHelperArgOptsMap = (): Record<string, string | string[]> => ({
  // filterTypeName? : 'string'
  isRequired: 'boolean',
  onlyIndexed: 'boolean',
  requiredFields: ['string', 'string[]'],
  operators: ['FilterOperatorsOptsMap', 'boolean'],
  removeFields: ['string', 'string[]'],
});

export function filterHelperArgs<TDoc extends Document = any>(
  typeComposer: ObjectTypeComposer<TDoc, any>,
  model: Model<TDoc>,
  opts?: FilterHelperArgsOpts
): ObjectTypeComposerArgumentConfigMap<{ filter: any }> {
  if (!(typeComposer instanceof ObjectTypeComposer)) {
    throw new Error('First arg for filterHelperArgs() should be instance of ObjectTypeComposer.');
  }

  if (!model || !model.modelName || !model.schema) {
    throw new Error('Second arg for filterHelperArgs() should be instance of MongooseModel.');
  }

  if (!opts) {
    throw new Error('You should provide non-empty options.');
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

  const { prefix, suffix } = opts;
  const filterTypeName: string = `${prefix}${typeComposer.getTypeName()}${suffix}`;
  const itc = typeComposer.getInputTypeComposer().clone(filterTypeName);

  makeFieldsRecursiveNullable(itc, { prefix, suffix });

  itc.removeField(removeFields);

  if (opts.requiredFields) {
    itc.makeFieldNonNull(opts.requiredFields);
  }

  if (itc.getFieldNames().length === 0) {
    return {} as any;
  }

  if (!opts.baseTypeName) {
    opts.baseTypeName = typeComposer.getTypeName();
  }
  addFilterOperators(itc, model, opts);

  return {
    filter: {
      type: opts.isRequired ? itc.NonNull : itc,
      description: opts.onlyIndexed ? 'Filter only by indexed fields' : 'Filter by fields',
    },
  };
}

export function filterHelper(
  resolveParams: ExtendedResolveParams,
  aliases: AliasesMap | false
): void {
  const filter = resolveParams.args && resolveParams.args.filter;
  if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
    const modelFields = (resolveParams.query as any)?.schema?.paths;

    const { _ids, ...filterFields } = filter;
    if (_ids && Array.isArray(_ids)) {
      // eslint-disable-next-line
      resolveParams.query = resolveParams.query.where({ _id: { $in: _ids } });
    }
    processFilterOperators(filterFields);
    const clearedFilter: Record<string, any> = {};
    Object.keys(filterFields).forEach((key) => {
      if (modelFields[key] || key.indexOf('$') === 0) {
        clearedFilter[key] = filterFields[key];
      } else if (aliases && aliases?.[key]) {
        clearedFilter[aliases[key]] = filterFields[key];
      }
    });
    if (Object.keys(clearedFilter).length > 0) {
      // eslint-disable-next-line
      resolveParams.query = resolveParams.query.where(toMongoFilterDottedObject(clearedFilter));
    }
  }

  if (isObject(resolveParams.rawQuery)) {
    // eslint-disable-next-line
    resolveParams.query = resolveParams.query.where(resolveParams.rawQuery);
  }
}
