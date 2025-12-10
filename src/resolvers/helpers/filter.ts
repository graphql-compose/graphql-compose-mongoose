/* eslint-disable no-use-before-define */

import {
  ObjectTypeComposer,
  InterfaceTypeComposer,
  ObjectTypeComposerArgumentConfigMap,
  InputTypeComposer,
} from 'graphql-compose';
import type { Model, HydratedDocument } from 'mongoose';
import { isObject, toMongoFilterDottedObject, getIndexedFieldNamesForGraphQL } from '../../utils';
import type { ExtendedResolveParams } from '../index';
import {
  FieldsOperatorsConfig,
  addFilterOperators,
  processFilterOperators,
} from './filterOperators';
import type { NestedAliasesMap } from './aliases';
import { makeFieldsRecursiveNullable } from '../../utils/makeFieldsRecursiveNullable';
import { mongoose } from 'src/__mocks__/mongooseCommon';

export type FilterHelperArgsOpts = {
  /**
   * Add to filter arg only that fields which are indexed.
   * If false then all fields will be available for filtering.
   * By default: true
   */
  onlyIndexed?: boolean;
  /**
   * You an remove some fields from type via this option.
   */
  removeFields?: string | string[];
  /**
   * This option makes provided fieldNames as required
   */
  requiredFields?: string | string[];
  /**
   * Customize operators filtering or disable it at all.
   * By default will be provided all operators only for indexed fields.
   */
  operators?: FieldsOperatorsConfig | false;
  /**
   * Make arg `filter` as required if this option is true.
   */
  isRequired?: boolean;
  /**
   * Base type name for generated filter argument.
   */
  baseTypeName?: string;
  /**
   * Provide custom prefix for Type name
   */
  prefix?: string;
  /**
   * Provide custom suffix for Type name
   */
  suffix?: string;
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

export function filterHelperArgs<TDoc extends HydratedDocument<any> = any>(
  typeComposer: ObjectTypeComposer<TDoc, any> | InterfaceTypeComposer<TDoc, any>,
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

  let itc;
  if (typeComposer.schemaComposer.hasInstance(filterTypeName, InputTypeComposer)) {
    itc = typeComposer.schemaComposer.getITC(filterTypeName);
  } else {
    itc = typeComposer.getInputTypeComposer().clone(filterTypeName);

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
  }

  return {
    filter: {
      type: opts.isRequired ? itc.NonNull : itc,
      description: opts.onlyIndexed ? 'Filter only by indexed fields' : 'Filter by fields',
    },
  };
}

export function filterHelper(
  resolveParams: ExtendedResolveParams,
  aliases?: NestedAliasesMap
): void {
  const filter = resolveParams.args?.filter;
  if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
    const schemaFields = (resolveParams.query as any)?.schema?.paths;

    const { _ids, ...filterFields } = filter;
    if (_ids && Array.isArray(_ids)) {
      resolveParams.query = resolveParams.query.where({ _id: { $in: _ids } });
    }
    processFilterOperators(filterFields);
    const mongooseFilter = convertFilterFields(filterFields, schemaFields, aliases);

    if (Object.keys(mongooseFilter).length > 0) {
      resolveParams.query = resolveParams.query.where(mongooseFilter);
    }
  }

  if (isObject(resolveParams.rawQuery)) {
    resolveParams.query = resolveParams.query.where(resolveParams.rawQuery);
  }
}

function convertFilterFields(
  filterFields: Record<string, any>,
  schemaFields: { [key: string]: mongoose.SchemaType },
  aliases?: NestedAliasesMap
) {
  const clearedFilter: Record<string, any> = {};
  Object.keys(filterFields).forEach((key) => {
    const value = filterFields[key];
    if (key.startsWith('$')) {
      clearedFilter[key] = Array.isArray(value)
        ? value.map((v) => toMongoFilterDottedObject(v, aliases))
        : toMongoFilterDottedObject(value, aliases);
    } else if (
      schemaFields[key] ||
      aliases?.[key] ||
      isNestedFilterField(key, value, schemaFields)
    ) {
      const alias = aliases?.[key];
      let newKey;
      let subAlias: NestedAliasesMap | undefined;
      if (typeof alias === 'string') {
        newKey = alias;
      } else if (isObject(alias)) {
        subAlias = alias;
        newKey = alias?.__selfAlias;
      } else {
        newKey = key;
      }
      toMongoFilterDottedObject(value, subAlias, clearedFilter, newKey);
    }
  });

  return clearedFilter;
}

function isNestedFilterField(
  key: string,
  value: any,
  schemaFields: { [key: string]: mongoose.SchemaType }
): boolean {
  if (!isObject(value)) return false;

  return Object.keys(schemaFields).some((dottedPath) => dottedPath.startsWith(`${key}.`));
}
