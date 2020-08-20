/* @flow */
/* eslint-disable no-use-before-define */

import {
  getNamedType,
  type GraphQLInputType,
  SchemaMetaFieldDef,
  GraphQLInputObjectType,
  GraphQLScalarType,
  GraphQLEnumType,
} from 'graphql-compose/lib/graphql';
import type { MongooseModel, Schema } from 'mongoose';
import { InputTypeComposer, camelCase } from 'graphql-compose';
import { isGetAccessor } from 'typescript';
import { upperFirst, getIndexedFieldNamesForGraphQL } from '../../utils';
import type { FilterHelperArgsOpts } from './filter';

export type FilterOperatorNames =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'ne'
  | 'in[]'
  | 'nin[]'
  | 'regex'
  | 'exists';
const availableOperators: FilterOperatorNames[] = [
  'gt',
  'gte',
  'lt',
  'lte',
  'ne',
  'in[]',
  'nin[]',
  'regex',
  'exists',
];

export const OPERATORS_FIELDNAME = '_operators';

export function _createRegexInput(itc: InputTypeComposer<any>) {
  const regexITC = itc.schemaComposer.getOrCreateITC(`${OPERATORS_FIELDNAME}RegexInput`, (tc) => {
    tc.addFields({
      match: {
        name: `${OPERATORS_FIELDNAME}RegexStringInput`,
        type: 'String!',
      },
      options: {
        name: `${OPERATORS_FIELDNAME}RegexOptionsInput`,
        type: 'String',
      },
    });
  });
}

export function addFilterOperators(
  itc: InputTypeComposer<any>,
  model: MongooseModel,
  opts: FilterHelperArgsOpts
) {
  _createRegexInput(itc);

  if (!{}.hasOwnProperty.call(opts, 'operators') || opts.operators !== false) {
    _createOperatorsField(itc, `Operators${opts.filterTypeName || ''}`, model, opts);
  }

  itc.addFields({
    OR: [itc.getTypeNonNull()],
    AND: [itc.getTypeNonNull()],
  });
}

export function _availableOperatorsFields(
  fieldName: String,
  itc: InputTypeComposer,
  opts: FilterHelperArgsOpts,
  operatorsConfig: any
) {
  const fields = [];

  const operators = Array.isArray(operatorsConfig)
    ? operatorsConfig.filter(
        (value) => availableOperators.includes(value) || availableOperators.includes(`${value}[]`)
      )
    : availableOperators;

  operators.forEach((operatorName) => {
    const fc = itc.getFieldConfig(fieldName);
    // unwrap from GraphQLNonNull and GraphQLList, if present
    let namedType: GraphQLInputType = (getNamedType(fc.type): any);

    // just treat enums as strings
    if (namedType instanceof GraphQLEnumType) {
      namedType = 'String';
    }

    if (namedType) {
      if (['in', 'nin', 'in[]', 'nin[]'].includes(operatorName)) {
        // wrap with GraphQLList, if operator required this with `[]`
        const newName = operatorName.slice(-2) === '[]' ? operatorName.slice(0, -2) : operatorName;
        fields[newName] = {
          ...fc,
          type: [namedType],
        };
      } else {
        if (operatorName === 'exists') {
          namedType = 'Boolean';
        } else if (operatorName === 'regex') {
          namedType = itc.schemaComposer.getITC(`${OPERATORS_FIELDNAME}RegexInput`);
        }
        fields[operatorName] = {
          ...fc,
          type: namedType,
        };
      }
    }
  });
  return fields;
}

export function _recurseSchema(
  inputITC: InputTypeComposer,
  sourceITC: InputTypeComposer,
  typeName: String,
  pathName?: String,
  schema: Schema,
  opts: FilterHelperArgsOpts,
  operators: any
) {
  const { schemaComposer } = sourceITC;

  const sourceType = sourceITC.getType();

  if (sourceType instanceof GraphQLInputObjectType) {
    Object.keys(sourceITC.getFields()).forEach((fieldName) => {
      const field = sourceITC.getField(fieldName);
      const fieldTC = sourceITC.getFieldTC(fieldName);
      const fieldType = fieldTC.getType();

      // alias
      const fullPath = pathName ? `${pathName}.${fieldName}` : fieldName;
      let schemaType;
      if (schema) {
        if (schema.pathType) {
          const pathType = schema.pathType(fullPath);
          schemaType = schema.path(fullPath);
          if (pathType === 'virtual') schemaType = schema.virtualpath(fullPath);
          if (pathType === 'nested') schemaType = null;
        } else if (typeof schema.path === 'string') {
          schemaType = null; // array?
        }
      }
      const isIndexed = schemaType?.options?.index || fieldName === '_id';
      const isRequired = schemaType?.options?.required;

      const hasOperatorsConfig =
        opts.operators &&
        operators &&
        operators[fieldName] &&
        Object.keys(operators[fieldName]).length >= 1;
      const operatorsConfig = hasOperatorsConfig ? operators[fieldName] : undefined;

      // prevent infinite recursion
      if (sourceType === fieldType) return;

      if (fieldType instanceof GraphQLScalarType) {
        const newITC = schemaComposer.createInputTC({
          name: `${fieldName}${typeName}`,
          type: isRequired ? fieldTC.getTypeNonNull() : fieldType,
        });

        if (
          (opts.onlyIndexed && isIndexed) ||
          !!opts.onlyIndexed ||
          hasOperatorsConfig ||
          !opts.operators
        ) {
          newITC.addFields(_availableOperatorsFields(fieldName, sourceITC, opts, operatorsConfig));
          inputITC.addFields({
            [fieldName]: newITC,
          });
        }
      } else if (fieldType instanceof GraphQLInputObjectType) {
        const newITC = schemaComposer.createInputTC({
          name: `${fieldName}${typeName}`,
          type: fieldType,
        });

        _recurseSchema(
          newITC,
          fieldTC,
          `${upperFirst(fieldName)}${typeName}`,
          `${fieldName}`,
          schemaType || schema,
          opts,
          operatorsConfig
        );
        if (
          (opts.onlyIndexed && isIndexed) ||
          !!opts.onlyIndexed ||
          hasOperatorsConfig ||
          !opts.operators
        ) {
          inputITC.addFields({
            [fieldName]: newITC,
          });
        }
      } else if (fieldType instanceof GraphQLEnumType) {
        const newITC = schemaComposer.createInputTC({
          name: `${fieldName}${typeName}`,
          type: 'String',
        });
        if (
          (opts.onlyIndexed && isIndexed) ||
          !!opts.onlyIndexed ||
          hasOperatorsConfig ||
          !opts.operators
        ) {
          newITC.addFields(_availableOperatorsFields(fieldName, sourceITC, opts, operatorsConfig));
          inputITC.addFields({
            [fieldName]: newITC,
          });
        }
      }
    });
  }
}

export function _createOperatorsField<TContext>(
  itc: InputTypeComposer<TContext>,
  typeName: string,
  model: MongooseModel,
  opts: FilterHelperArgsOpts
): InputTypeComposer<TContext> {
  _createRegexInput(itc);

  const operatorsITC = itc.schemaComposer.getOrCreateITC(typeName, (tc) => {
    tc.setDescription('For performance reason this type contains only *indexed* fields.');
  });

  _recurseSchema(operatorsITC, itc, typeName, null, model.schema, opts, opts.operators);

  itc.setField(OPERATORS_FIELDNAME, {
    type: operatorsITC,
    description: 'List of *indexed* fields that can be filtered via operators.',
  });

  return operatorsITC;
}

export const _recurseFields = (fields: Object) => {
  let selectors = {};
  if (fields === Object(fields)) {
    Object.keys(fields).forEach((fieldName) => {
      if (availableOperators.includes(fieldName) || availableOperators.includes(`${fieldName}[]`)) {
        let selection = fields[fieldName];
        if (fieldName === 'regex') {
          selection = new RegExp(fields[fieldName].match, fields[fieldName].options);
        }
        selectors[`$${fieldName}`] = selection;
      } else {
        selectors[fieldName] = _recurseFields(fields[fieldName]);
      }
    });
  } else if (Array.isArray(fields)) {
    Object.keys(fields).forEach((fieldName) => {
      selectors[fieldName] = _recurseFields(fields[fieldName]);
    });
  } else {
    selectors = fields;
  }
  return selectors;
};

export function processFilterOperators(filter: Object) {
  if (!filter) return filter;

  _prepareAndOrFilter(filter);

  if (filter[OPERATORS_FIELDNAME]) {
    const operatorFields = filter[OPERATORS_FIELDNAME];
    Object.keys(operatorFields).forEach((fieldName) => {
      // eslint-disable-next-line no-param-reassign
      filter[fieldName] = _recurseFields(operatorFields[fieldName]);
    });
    // eslint-disable-next-line no-param-reassign
    delete filter[OPERATORS_FIELDNAME];
  }

  return filter;
}

export function _prepareAndOrFilter(filter: Object) {
  /* eslint-disable no-param-reassign */
  if (!filter.OR && !filter.AND) return;

  const { OR, AND } = filter;
  if (OR) {
    const $or = OR.map((d) => {
      processFilterOperators(d);
      return d;
    });
    filter.$or = $or;
    delete filter.OR;
  }

  if (AND) {
    const $and = AND.map((d) => {
      processFilterOperators(d);
      return d;
    });
    filter.$and = $and;
    delete filter.AND;
  }
  /* eslint-enable no-param-reassign */
}
