import type { Model } from 'mongoose';
import { EnumTypeComposer, InputTypeComposer, inspect, ScalarTypeComposer } from 'graphql-compose';
import type { InputTypeComposerFieldConfigAsObjectDefinition } from 'graphql-compose';

import { upperFirst, getIndexesFromModel } from '../../utils';
import type { FilterHelperArgsOpts } from './filter';
import GraphQLRegExpAsString from '../../types/RegExpAsString';

export const availableOperators = [
  'gt',
  'gte',
  'lt',
  'lte',
  'ne',
  'in',
  'nin',
  'regex',
  'exists',
] as const;

export type AllowedOperatorsName = (typeof availableOperators)[number];

/**
 * Customize operators filtering or disable it at all.
 * By default, for performance reason, `graphql-compose-mongoose` generates operators
 * *only for indexed* fields.
 *
 * BUT you may enable operators for all fields when creating resolver in the following way:
 *   // enables all operators for all fields
 *   operators: true,
 * OR provide a more granular `operators` configuration to suit your needs:
 *   operators: {
 *     // for `age` field add just 3 operators
 *     age: ['in', 'gt', 'lt'],
 *     // for non-indexed `amount` field add all operators
 *     amount: true,
 *     // don't add this field to operators
 *     indexedField: false,
 *   }
 *
 * Available logic operators: AND, OR
 * Available field operators: gt, gte, lt, lte, ne, in, nin, regex, exists
 */
export type FieldsOperatorsConfig =
  | {
      [fieldName: string]: FieldsOperatorsConfig | AllowedOperatorsName[] | boolean;
    }
  | boolean;

export const OPERATORS_FIELDNAME = '_operators';

export function addFilterOperators(
  itc: InputTypeComposer<any>,
  model: Model<any>,
  opts: FilterHelperArgsOpts
): void {
  if (opts?.operators !== false) {
    _createOperatorsField(itc, model, {
      baseTypeName: opts.baseTypeName || itc.getTypeName(),
      operators: opts.operators,
      onlyIndexed: opts.onlyIndexed || true,
      prefix: opts.prefix || '',
      suffix: `Operators${opts.suffix || ''}`,
    });
  }

  itc.addFields({
    OR: itc.NonNull.List,
    AND: itc.NonNull.List,
  });
}

export function _availableOperatorsFields(
  fieldName: string,
  itc: InputTypeComposer,
  useOperators: AllowedOperatorsName[] | undefined | true
): Record<string, InputTypeComposerFieldConfigAsObjectDefinition> {
  const fields: Record<string, InputTypeComposerFieldConfigAsObjectDefinition> = {};

  const operators = Array.isArray(useOperators)
    ? useOperators.filter((value) => availableOperators.includes(value))
    : availableOperators;

  operators.forEach((operatorName: string) => {
    const fieldTC = itc.getFieldTC(fieldName);

    if (fieldTC) {
      if (['in', 'nin', 'in[]', 'nin[]'].includes(operatorName)) {
        // wrap with GraphQLList, if operator required this with `[]`
        const newName = operatorName.slice(-2) === '[]' ? operatorName.slice(0, -2) : operatorName;
        fields[newName] = { type: [fieldTC] };
      } else {
        if (operatorName === 'exists') {
          fields[operatorName] = { type: 'Boolean' };
        } else if (operatorName === 'regex') {
          // Only for fields with type String allow regex operator
          if (fieldTC.getTypeName() === 'String') {
            fields[operatorName] = { type: GraphQLRegExpAsString };
          }
        } else {
          fields[operatorName] = { type: fieldTC };
        }
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
  opts: CreateOperatorsFieldOpts,
  indexedFields: string[],
  pathName: string | null
): void {
  const { schemaComposer } = sourceITC;

  sourceITC.getFieldNames().forEach((fieldName: string) => {
    const fieldPath = pathName ? `${pathName}.${fieldName}` : fieldName;
    // if field is indexed or indexed some sub-field
    const isIndexed = indexedFields.some((v) => v === fieldPath || v.startsWith(`${fieldPath}.`));

    const fieldOperatorsConfig =
      opts.operators === true ? true : opts.operators && opts.operators[fieldName];
    if (fieldOperatorsConfig === false) {
      // operators are disabled for current field SO skip field addition
      return;
    }
    if (opts.onlyIndexed && !isIndexed && !fieldOperatorsConfig) {
      // field does not have index & does not have manual config SO skip field addition
      return;
    }
    if (Array.isArray(fieldOperatorsConfig) && fieldOperatorsConfig.length === 0) {
      // empty list of available operators SO skip field addition
      return;
    }

    const fieldTC = sourceITC.getFieldTC(fieldName);

    // prevent infinite recursion
    if (sourceITC === fieldTC) return;

    const baseTypeName = `${opts.baseTypeName}${upperFirst(fieldName)}`;
    const inputFieldTypeName = `${opts.prefix || ''}${baseTypeName}${opts.suffix || ''}`;

    if (fieldTC instanceof ScalarTypeComposer || fieldTC instanceof EnumTypeComposer) {
      if (
        fieldOperatorsConfig &&
        !Array.isArray(fieldOperatorsConfig) &&
        fieldOperatorsConfig !== true
      ) {
        throw new Error(
          `You provide incorrect operators config for field '${
            opts.baseTypeName
          }.${fieldName}'. This field has Scalar type, so you may provide array or false. Received: ${inspect(
            fieldOperatorsConfig
          )}`
        );
      }
      const fields = _availableOperatorsFields(fieldName, sourceITC, fieldOperatorsConfig);
      if (Object.keys(fields).length > 0) {
        // create new input type with operators for current field
        const fieldOperatorsITC = schemaComposer
          .createInputTC(inputFieldTypeName)
          .addFields(fields);
        // add new field to filter with new input type
        inputITC.addFields({
          [fieldName]: fieldOperatorsITC,
        });
      }
    } else if (fieldTC instanceof InputTypeComposer) {
      const fieldOperatorsITC = schemaComposer.createInputTC(inputFieldTypeName);
      _recurseSchema(
        fieldOperatorsITC,
        fieldTC as InputTypeComposer,
        {
          ...opts,
          baseTypeName,
          operators: fieldOperatorsConfig as FieldsOperatorsConfig,
        },
        indexedFields,
        fieldPath
      );

      if (fieldOperatorsITC.getFieldNames().length > 0) {
        inputITC.addFields({
          [fieldName]: fieldOperatorsITC,
        });
      }
    }
  });
}

interface CreateOperatorsFieldOpts {
  baseTypeName: string;
  operators?: FieldsOperatorsConfig;
  onlyIndexed?: boolean;
  prefix?: string;
  suffix?: string;
}

export function _createOperatorsField<TContext>(
  itc: InputTypeComposer<TContext>,
  model: Model<any>,
  opts: CreateOperatorsFieldOpts
): InputTypeComposer<TContext> {
  const operatorsITC = itc.schemaComposer.getOrCreateITC(
    `${opts.prefix || ''}${opts.baseTypeName}${opts.suffix || ''}`,
    (tc) => {
      if (opts.onlyIndexed) {
        tc.setDescription('For performance reason this type contains only *indexed* fields.');
      }
    }
  );

  const indexedFields = getIndexesFromModel(model).map((o) => Object.keys(o)[0]);
  _recurseSchema(operatorsITC, itc, opts, indexedFields, null);

  if (operatorsITC.getFieldNames().length > 0) {
    itc.setField(OPERATORS_FIELDNAME, {
      type: operatorsITC,
      description: opts.onlyIndexed
        ? 'List of *indexed* fields that can be filtered via operators.'
        : undefined,
    });
  }

  return operatorsITC;
}

export type SelectorOptions = {
  [k: string]: SelectorOptions | string | string[] | RegExp;
};

export function _recurseFields(fields: SelectorOptions): SelectorOptions {
  let selectors: SelectorOptions = {};
  if (fields === Object(fields)) {
    Object.keys(fields).forEach((fieldName) => {
      const operators: string[] = Object.values(availableOperators);
      if (operators.includes(fieldName)) {
        selectors[`$${fieldName}`] = fields[fieldName];
      } else {
        selectors[fieldName] = _recurseFields(fields[fieldName] as SelectorOptions);
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
}

export function processFilterOperators(filter: Record<string, any>): SelectorOptions {
  if (!filter) return filter;

  _prepareAndOrFilter(filter);

  if (filter[OPERATORS_FIELDNAME]) {
    const operatorFields = filter[OPERATORS_FIELDNAME];
    Object.keys(operatorFields).forEach((fieldName) => {
      filter[fieldName] = _recurseFields(operatorFields[fieldName]);
    });
    delete filter[OPERATORS_FIELDNAME];
  }

  return filter;
}

export function _prepareAndOrFilter(filter: Record<'OR' | 'AND' | '$or' | '$and', any>): void {
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
}
