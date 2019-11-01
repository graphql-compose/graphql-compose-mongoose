/* @flow */
/* eslint-disable no-use-before-define */

import { getNamedType, type GraphQLInputType } from 'graphql-compose/lib/graphql';
import type { MongooseModel } from 'mongoose';
import type { InputTypeComposer } from 'graphql-compose';
import { upperFirst, getIndexedFieldNamesForGraphQL } from '../../utils';
import type { FilterHelperArgsOpts } from './filter';

export type FilterOperatorNames = 'gt' | 'gte' | 'lt' | 'lte' | 'ne' | 'in[]' | 'nin[]';
const availableOperators: FilterOperatorNames[] = ['gt', 'gte', 'lt', 'lte', 'ne', 'in[]', 'nin[]'];

export const OPERATORS_FIELDNAME = '_operators';

export type FilterOperatorsOpts = {
  [fieldName: string]: FilterOperatorNames[] | false,
};

export function addFilterOperators(
  itc: InputTypeComposer<any>,
  model: MongooseModel,
  opts: FilterHelperArgsOpts
) {
  if (!{}.hasOwnProperty.call(opts, 'operators') || opts.operators !== false) {
    _createOperatorsField(
      itc,
      `Operators${opts.filterTypeName || ''}`,
      model,
      opts.operators || {}
    );
  }

  itc.addFields({
    OR: [itc.getTypeNonNull()],
    AND: [itc.getTypeNonNull()],
  });
}

export function processFilterOperators(filter: Object) {
  if (!filter) return filter;
  _prepareAndOrFilter(filter);
  if (filter[OPERATORS_FIELDNAME]) {
    const operatorFields = filter[OPERATORS_FIELDNAME];
    Object.keys(operatorFields).forEach(fieldName => {
      const fieldOperators = { ...operatorFields[fieldName] };
      const criteria = {};
      Object.keys(fieldOperators).forEach(operatorName => {
        if (Array.isArray(fieldOperators[operatorName])) {
          criteria[`$${operatorName}`] = fieldOperators[operatorName].map(v =>
            processFilterOperators(v)
          );
        } else {
          criteria[`$${operatorName}`] = processFilterOperators(fieldOperators[operatorName]);
        }
      });
      if (Object.keys(criteria).length > 0) {
        // eslint-disable-next-line
        filter[fieldName] = criteria;
      }
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
    const $or = OR.map(d => {
      processFilterOperators(d);
      return d;
    });
    filter.$or = $or;
    delete filter.OR;
  }

  if (AND) {
    const $and = AND.map(d => {
      processFilterOperators(d);
      return d;
    });
    filter.$and = $and;
    delete filter.AND;
  }
  /* eslint-enable no-param-reassign */
}

export function _createOperatorsField<TContext>(
  itc: InputTypeComposer<TContext>,
  typeName: string,
  model: MongooseModel,
  operatorsOpts: FilterOperatorsOpts
): InputTypeComposer<TContext> {
  const operatorsITC = itc.schemaComposer.getOrCreateITC(typeName, tc => {
    tc.setDescription('For performance reason this type contains only *indexed* fields.');
  });

  // if `opts.resolvers.[resolverName].filter.operators` is empty and not disabled via `false`
  // then fill it up with indexed fields
  const indexedFields = getIndexedFieldNamesForGraphQL(model);
  if (Object.keys(operatorsOpts).length === 0) {
    indexedFields.forEach(fieldName => {
      operatorsOpts[fieldName] = availableOperators; // eslint-disable-line
    });
  }

  itc.getFieldNames().forEach(fieldName => {
    if (operatorsOpts[fieldName] && operatorsOpts[fieldName] !== false) {
      const fields = {};
      let operators;
      if (operatorsOpts[fieldName] && Array.isArray(operatorsOpts[fieldName])) {
        operators = operatorsOpts[fieldName];
      } else {
        operators = availableOperators;
      }
      operators.forEach(operatorName => {
        const fc = itc.getFieldConfig(fieldName);
        // unwrap from GraphQLNonNull and GraphQLList, if present
        const namedType: GraphQLInputType = (getNamedType(fc.type): any);
        if (namedType) {
          if (operatorName.slice(-2) === '[]') {
            // wrap with GraphQLList, if operator required this with `[]`
            const newName = operatorName.slice(0, -2);
            fields[newName] = {
              ...fc,
              type: [namedType],
            };
          } else {
            fields[operatorName] = {
              ...fc,
              type: namedType,
            };
          }
        }
      });
      if (Object.keys(fields).length > 0) {
        const operatorTypeName = `${upperFirst(fieldName)}${typeName}`;
        const operatorITC = itc.schemaComposer.getOrCreateITC(operatorTypeName, tc => {
          tc.setFields((fields: any));
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
