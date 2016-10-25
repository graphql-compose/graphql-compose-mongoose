/* @flow */
/* eslint-disable no-use-before-define */

import {
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLList,
  getNamedType,
} from 'graphql';
import { TypeComposer, InputTypeComposer } from 'graphql-compose';
import { getIndexesFromModel } from '../../utils/getIndexesFromModel';
import { isObject } from '../../utils/is';
import { toDottedObject, upperFirst } from '../../utils';
import typeStorage from '../../typeStorage';
import type {
  GraphQLFieldConfigArgumentMap,
  ExtendedResolveParams,
  MongooseModelT,
  filterHelperArgsOpts,
  filterOperatorsOpts,
  filterOperatorNames,
} from '../../definition';

export const OPERATORS_FIELDNAME = '_operators';


export const filterHelperArgs = (
  typeComposer: TypeComposer,
  model: MongooseModelT,
  opts: filterHelperArgsOpts
): GraphQLFieldConfigArgumentMap => {
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('First arg for filterHelperArgs() should be instance of TypeComposer.');
  }

  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'Second arg for filterHelperArgs() should be instance of MongooseModel.'
    );
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
    const indexedFieldNames = getIndexedFieldNames(model);
    Object.keys(typeComposer.getFields()).forEach(fieldName => {
      if (indexedFieldNames.indexOf(fieldName) === -1) {
        removeFields.push(fieldName);
      }
    });
  }

  const filterTypeName: string = opts.filterTypeName;
  const inputComposer = typeComposer.getInputTypeComposer().clone(filterTypeName);
  inputComposer.removeField(removeFields);

  if (opts.requiredFields) {
    inputComposer.makeRequired(opts.requiredFields);
  }

  if (!{}.hasOwnProperty.call(opts, 'operators') || opts.operators !== false) {
    addFieldsWithOperator(
      // $FlowFixMe
      `Operators${opts.filterTypeName}`,
      inputComposer,
      model,
      opts.operators || {}
    );
  }

  if (inputComposer.getFieldNames().length === 0) {
    return {};
  }

  return {
    filter: {
      name: 'filter',
      type: opts.isRequired
        ? new GraphQLNonNull(inputComposer.getType())
        : inputComposer.getType(),
      description: opts.onlyIndexed
        ? 'Filter only by indexed fields'
        : 'Filter by fields',
    },
  };
};

export function filterHelper(resolveParams: ExtendedResolveParams): void {
  // $FlowFixMe
  const filter = resolveParams.args && resolveParams.args.filter;
  if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
    const modelFields = resolveParams.query.schema.paths;
    const clearedFilter = {};
    Object.keys(filter).forEach((key) => {
      if (modelFields[key]) {
        clearedFilter[key] = filter[key];
      }
    })
    if (Object.keys(clearedFilter).length > 0) {
      resolveParams.query = resolveParams.query.where(toDottedObject(clearedFilter)); // eslint-disable-line
    }

    if (filter[OPERATORS_FIELDNAME]) {
      const operatorFields = filter[OPERATORS_FIELDNAME];
      Object.keys(operatorFields).forEach(fieldName => {
        const fieldOperators = Object.assign({}, operatorFields[fieldName]);
        const criteria = {};
        Object.keys(fieldOperators).forEach(operatorName => {
          criteria[`$${operatorName}`] = fieldOperators[operatorName];
        });
        if (Object.keys(criteria).length > 0) {
          resolveParams.query = resolveParams.query.where({ // eslint-disable-line
            [fieldName]: criteria,
          });
        }
      });
    }
  }

  if (isObject(resolveParams.rawQuery)) {
    resolveParams.query = resolveParams.query.where( // eslint-disable-line
      // $FlowFixMe
      resolveParams.rawQuery
    );
  }
}

export function getIndexedFieldNames(model: MongooseModelT): string[] {
  const indexes = getIndexesFromModel(model);

  const fieldNames = [];
  indexes.forEach((indexData) => {
    const keys = Object.keys(indexData);
    const clearedName = keys[0].replace(/[^_a-zA-Z0-9]/i, '__');
    fieldNames.push(clearedName);
  });

  return fieldNames;
}

export function addFieldsWithOperator(
  typeName: string,
  inputComposer: InputTypeComposer,
  model: MongooseModelT,
  operatorsOpts: filterOperatorsOpts
): InputTypeComposer {
  const operatorsComposer = new InputTypeComposer(
    typeStorage.getOrSet(
      typeName,
      new GraphQLInputObjectType({
        name: typeName,
        fields: {},
      })
    )
  );

  const availableOperators: filterOperatorNames[]
    = ['gt', 'gte', 'lt', 'lte', 'ne', 'in[]', 'nin[]'];

  // if `opts.resolvers.[resolverName].filter.operators` is empty and not disabled via `false`
  // then fill it up with indexed fields
  const indexedFields = getIndexedFieldNames(model);
  if (operatorsOpts !== false && Object.keys(operatorsOpts).length === 0) {
    indexedFields.forEach(fieldName => {
      operatorsOpts[fieldName] = availableOperators; // eslint-disable-line
    });
  }

  const existedFields = inputComposer.getFields();
  Object.keys(existedFields).forEach(fieldName => {
    if (operatorsOpts[fieldName] && operatorsOpts[fieldName] !== false) {
      const fields = {};
      let operators;
      if (operatorsOpts[fieldName] && Array.isArray(operatorsOpts[fieldName])) {
        operators = operatorsOpts[fieldName];
      } else {
        operators = availableOperators;
      }
      operators.forEach(operatorName => {
        // unwrap from GraphQLNonNull and GraphQLList, if present
        const namedType = getNamedType(existedFields[fieldName].type);
        if (namedType) {
          if (operatorName.slice(-2) === '[]') {
            // wrap with GraphQLList, if operator required this with `[]`
            const newName = operatorName.slice(0, -2);
            fields[newName] = {
              ...existedFields[fieldName],
              type: new GraphQLList(namedType),
            };
          } else {
            fields[operatorName] = {
              ...existedFields[fieldName],
              type: namedType,
            };
          }
        }
      });
      if (Object.keys(fields).length > 0) {
        const operatorTypeName = `${upperFirst(fieldName)}${typeName}`;
        operatorsComposer.setField(fieldName, {
          type: typeStorage.getOrSet(
            operatorTypeName,
            new GraphQLInputObjectType({
              name: operatorTypeName,
              fields,
            })
          ),
          description: 'Filter value by operator(s)',
        });
      }
    }
  });

  if (Object.keys(operatorsComposer.getFields()).length > 0) {
    inputComposer.setField(OPERATORS_FIELDNAME, {
      type: operatorsComposer.getType(),
      description: 'List of fields that can be filtered via operators',
    });
  }

  return operatorsComposer;
}
