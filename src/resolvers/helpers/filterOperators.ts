/* eslint-disable no-use-before-define */

import {
  getNamedType,
  GraphQLInputType,
  GraphQLInputObjectType,
  GraphQLScalarType,
  GraphQLEnumType,
} from 'graphql-compose/lib/graphql';
import type { Model, Schema, SchemaType, VirtualType } from 'mongoose';
import type { InputTypeComposer } from 'graphql-compose';
import type { InputTypeComposerFieldConfigAsObjectDefinition } from 'graphql-compose';

import { upperFirst } from '../../utils';
import type { FilterHelperArgsOpts } from './filter';
import GraphQLRegExpAsString from '../../types/RegExpAsString';

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

export enum availableOperators {
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  NE = 'ne',
  IN = 'in',
  NIN = 'nin',
  REGEX = 'regex',
  EXISTS = 'exists',
}

export type FilterOperatorsOpts =
  | {
      [fieldName: string]: FilterOperatorsOpts | FilterOperatorNames[] | false;
    }
  | false;

export const OPERATORS_FIELDNAME = '_operators';

export function addFilterOperators(
  itc: InputTypeComposer<any>,
  model: Model<any>,
  opts: FilterHelperArgsOpts
): void {
  if (!{}.hasOwnProperty.call(opts, 'operators') || opts.operators !== false) {
    _createOperatorsField(
      itc,
      `Operators${itc.getTypeName() || ''}`,
      model,
      opts.operators || false,
      opts.onlyIndexed
    );
  }

  itc.addFields({
    OR: [itc.getTypeNonNull()],
    AND: [itc.getTypeNonNull()],
  });
}

export function _availableOperatorsFields(
  fieldName: string,
  itc: InputTypeComposer,
  operatorsConfig: any
): Record<string, InputTypeComposerFieldConfigAsObjectDefinition> {
  const fields: Record<string, InputTypeComposerFieldConfigAsObjectDefinition> = {};

  const operators = Array.isArray(operatorsConfig)
    ? operatorsConfig.filter((value) => Object.values(availableOperators).includes(value))
    : Object.values(availableOperators);

  operators.forEach((operatorName: string) => {
    const fc = itc.getFieldConfig(fieldName);
    // unwrap from GraphQLNonNull and GraphQLList, if present
    let fieldType: GraphQLInputType | InputTypeComposer | string = getNamedType(
      fc.type
    ) as GraphQLInputType;

    // just treat enums as strings
    if (getNamedType(fc.type) instanceof GraphQLEnumType) {
      fieldType = 'String';
    }

    if (fieldType) {
      if (['in', 'nin', 'in[]', 'nin[]'].includes(operatorName)) {
        // wrap with GraphQLList, if operator required this with `[]`
        const newName = operatorName.slice(-2) === '[]' ? operatorName.slice(0, -2) : operatorName;
        fields[newName] = {
          ...fc,
          type: [fieldType],
        } as any;
      } else {
        if (operatorName === 'exists') {
          fieldType = 'Boolean';
        } else if (operatorName === 'regex') {
          fieldType = GraphQLRegExpAsString;
        }
        fields[operatorName] = {
          ...fc,
          type: fieldType,
        } as any;
      }
    }
  });
  return fields;
}

export type OperatorsConfig = {
  [k: string]: OperatorsConfig | string[];
};

export function _recurseSchema(
  inputITC: InputTypeComposer,
  sourceITC: InputTypeComposer<any>,
  typeName: string,
  schema: Schema | SchemaType | VirtualType | null,
  pathName: string | null,
  operatorsOpts: FilterOperatorsOpts,
  onlyIndexed: boolean
): void {
  const { schemaComposer } = sourceITC;

  Object.keys(sourceITC.getFields()).forEach((fieldName: string) => {
    const fieldTC = sourceITC.getFieldTC(fieldName);
    const fieldType = sourceITC.getFieldTC(fieldName).getType();

    // alias
    const fullPath = pathName ? `${pathName}.${fieldName}` : fieldName;
    let schemaType;
    if (schema) {
      // @ts-ignore
      if (schema.pathType) {
        // @ts-ignore
        const pathType = schema.pathType(fullPath);
        // @ts-ignore
        schemaType = schema.path(fullPath);
        // @ts-ignore
        if (pathType === 'virtual') schemaType = schema.virtualpath(fullPath);
        if (pathType === 'nested') schemaType = null;
        // @ts-ignore
      } else if (typeof schema.path === 'string') {
        schemaType = null; // array
      }
    }

    // Need to dig into this space
    // @ts-ignore
    const isIndexed: boolean = schemaType?.options?.index || fieldName === '_id';

    const hasOperatorsConfig =
      (operatorsOpts &&
        operatorsOpts[fieldName] &&
        Object.keys(operatorsOpts[fieldName]).length >= 1) ||
      (operatorsOpts && Array.isArray(operatorsOpts[fieldName]));
    const operatorsConfig = hasOperatorsConfig
      ? operatorsOpts && operatorsOpts[fieldName]
      : !(operatorsOpts === false);

    // prevent infinite recursion
    if (sourceITC.getType() === fieldType) return;

    if (fieldType instanceof GraphQLScalarType) {
      const newITC = schemaComposer.createInputTC(`${fieldName}${typeName}`);
      if ((onlyIndexed && isIndexed) || hasOperatorsConfig || !operatorsOpts) {
        newITC.addFields(_availableOperatorsFields(fieldName, sourceITC, operatorsConfig));
        inputITC.addFields({
          [fieldName]: newITC,
        });
      }
    } else if (fieldType instanceof GraphQLInputObjectType) {
      const newITC = schemaComposer.createInputTC(`${fieldName}${typeName}`);

      _recurseSchema(
        newITC,
        // @ts-ignore
        fieldTC,
        `${upperFirst(fieldName)}${typeName}`,
        schemaType || schema,
        `${fieldName}`,
        operatorsConfig,
        onlyIndexed
      );
      if ((onlyIndexed && isIndexed) || hasOperatorsConfig || !operatorsOpts) {
        inputITC.addFields({
          [fieldName]: newITC,
        });
      }
    } else if (fieldType instanceof GraphQLEnumType) {
      const newITC = schemaComposer.createInputTC({
        name: `${fieldName}${typeName}`,
        fields: {},
      });
      if ((onlyIndexed && isIndexed) || hasOperatorsConfig || !operatorsOpts) {
        newITC.addFields(_availableOperatorsFields(fieldName, sourceITC, operatorsConfig));
        inputITC.addFields({
          [fieldName]: newITC,
        });
      }
    }
  });
}

export function _createOperatorsField<TContext>(
  itc: InputTypeComposer<TContext>,
  typeName: string,
  model: Model<any>,
  operatorsOpts: FilterOperatorsOpts,
  onlyIndexed: boolean = false
): InputTypeComposer<TContext> {
  const operatorsITC = itc.schemaComposer.getOrCreateITC(typeName, (tc) => {
    tc.setDescription('For performance reason this type contains only *indexed* fields.');
  });

  _recurseSchema(operatorsITC, itc, typeName, model.schema, null, operatorsOpts, onlyIndexed);

  itc.setField(OPERATORS_FIELDNAME, {
    type: operatorsITC,
    description: 'List of *indexed* fields that can be filtered via operators.',
  });

  return operatorsITC;
}

export type SelectorOptions = {
  [k: string]: SelectorOptions | string | string[] | RegExp;
};

export const _recurseFields = (fields: SelectorOptions): SelectorOptions => {
  let selectors: SelectorOptions = {};
  if (fields === Object(fields)) {
    Object.keys(fields).forEach((fieldName) => {
      const operators: string[] = Object.values(availableOperators);
      if (operators.includes(fieldName)) {
        if (fieldName === 'regex') {
          selectors[`$${fieldName}`] = new RegExp(
            // @ts-ignore
            fields[`${fieldName}`].match,
            // @ts-ignore
            fields[`${fieldName}`].options
          );
        } else {
          selectors[`$${fieldName}`] = fields[fieldName];
        }
      } else {
        // @ts-ignore
        selectors[fieldName] = _recurseFields(fields[fieldName]);
      }
    });
  } else if (Array.isArray(fields)) {
    fields.forEach((fieldName) => {
      selectors[fieldName] = _recurseFields(fields[fieldName]);
    });
  } else {
    selectors = fields;
  }
  return selectors;
};

export function processFilterOperators(filter: Record<string, any>): SelectorOptions {
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

export function _prepareAndOrFilter(filter: Record<'OR' | 'AND' | '$or' | '$and', any>): void {
  /* eslint-disable no-param-reassign */
  if (!filter.OR && !filter.AND) return;

  const { OR, AND } = filter;
  if (OR) {
    const $or = OR.map((d: any) => {
      processFilterOperators(d);
      return d;
    });
    filter.$or = $or;
    delete filter.OR;
  }

  if (AND) {
    const $and = AND.map((d: any) => {
      processFilterOperators(d);
      return d;
    });
    filter.$and = $and;
    delete filter.AND;
  }
  /* eslint-enable no-param-reassign */
}
