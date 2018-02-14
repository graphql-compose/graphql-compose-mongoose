/* @flow */

import { getNamedType } from 'graphql-compose/lib/graphql';
import type { MongooseModel } from 'mongoose';
import type { InputTypeComposer } from 'graphql-compose';
import type { ExtendedResolveParams } from '../index';
import { upperFirst, getIndexedFieldNamesForGraphQL } from '../../utils';

export type FilterOperatorNames = 'gt' | 'gte' | 'lt' | 'lte' | 'ne' | 'in[]' | 'nin[]';
const availableOperators: FilterOperatorNames[] = ['gt', 'gte', 'lt', 'lte', 'ne', 'in[]', 'nin[]'];

export const OPERATORS_FIELDNAME = '_operators';

export type FilterOperatorsOpts = {
  [fieldName: string]: FilterOperatorNames[] | false,
};

export function addFieldWithOperators(
  itc: InputTypeComposer,
  typeName: string,
  model: MongooseModel,
  operatorsOpts: FilterOperatorsOpts
): InputTypeComposer {
  const operatorsITC = itc.constructor.schemaComposer.getOrCreateITC(typeName, tc => {
    tc.setDescription('For performance reason this type contains only *indexed* fields.');
  });

  // if `opts.resolvers.[resolverName].filter.operators` is empty and not disabled via `false`
  // then fill it up with indexed fields
  const indexedFields = getIndexedFieldNamesForGraphQL(model);
  if (operatorsOpts !== false && Object.keys(operatorsOpts).length === 0) {
    indexedFields.forEach(fieldName => {
      operatorsOpts[fieldName] = availableOperators; // eslint-disable-line
    });
  }

  const existedFields = itc.getFields();
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
              type: [namedType],
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
        const operatorITC = itc.constructor.schemaComposer.getOrCreateITC(operatorTypeName, tc => {
          tc.setFields(fields);
        });
        operatorsITC.setField(fieldName, operatorITC);
      }
    }
  });

  // add to main filterITC if was added some fields
  if (operatorsITC.getFieldNames().length > 0) {
    itc.setField(OPERATORS_FIELDNAME, {
      type: operatorsITC,
      description: 'List of *indexed* fields that can be filtered via operators.',
    });
  }

  return operatorsITC;
}

export function processFilterOperators(filter: Object, resolveParams: ExtendedResolveParams) {
  if (filter[OPERATORS_FIELDNAME]) {
    const operatorFields = filter[OPERATORS_FIELDNAME];
    Object.keys(operatorFields).forEach(fieldName => {
      const fieldOperators = { ...operatorFields[fieldName] };
      const criteria = {};
      Object.keys(fieldOperators).forEach(operatorName => {
        criteria[`$${operatorName}`] = fieldOperators[operatorName];
      });
      if (Object.keys(criteria).length > 0) {
        // eslint-disable-next-line
        resolveParams.query = resolveParams.query.where({
          [fieldName]: criteria,
        });
      }
    });
  }
}
