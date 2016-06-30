/* @flow */
/* eslint-disable no-use-before-define */

import TypeComposer from '../../../../graphql-compose/src/typeComposer';
import { GraphQLNonNull } from 'graphql/type';
import getIndexesFromModel from '../../utils/getIndexesFromModel';
import { toDottedObject } from '../../utils';
import type {
  GraphQLFieldConfigArgumentMap,
  ExtendedResolveParams,
  MongooseModelT,
  GraphQLObjectType,
  filterHelperArgsOpts,
} from '../../definition';

export const filterHelperArgs = (
  gqType: GraphQLObjectType,
  opts: filterHelperArgsOpts,
): GraphQLFieldConfigArgumentMap => {
  if (!opts.filterTypeName) {
    throw new Error('You should provide `filterTypeName` in options.');
  }
  const composer = new TypeComposer(gqType);

  const removeFields = [];
  if (opts.removeFields) {
    if (Array.isArray(opts.removeFields)) {
      removeFields.push(...opts.removeFields);
    } else {
      removeFields.push(opts.removeFields);
    }
  }

  if (opts.onlyIndexed) {
    if (!opts.model) {
      throw new Error('You should provide `model` in options with mongoose model '
                    + 'for deriving index fields.');
    }

    const indexedFieldNames = getIndexedFieldNames(opts.model);
    Object.keys(composer.getFields()).forEach(fieldName => {
      if (indexedFieldNames.indexOf(fieldName) === -1) {
        removeFields.push(fieldName);
      }
    });
  }


  const inputComposer = composer.getInputTypeComposer().clone(opts.filterTypeName);
  inputComposer.removeField(removeFields);

  if (opts.requiredFields) {
    inputComposer.makeFieldsRequired(opts.requiredFields);
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
  const filter = resolveParams.args && resolveParams.args.filter;
  if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
    resolveParams.query = resolveParams.query.where(toDottedObject(filter)); // eslint-disable-line
  }
}

export function getIndexedFieldNames(model: MongooseModelT): string[] {
  const indexes = getIndexesFromModel(model);

  const fieldNames = [];
  indexes.forEach((indexData) => {
    const keys = Object.keys(indexData);
    fieldNames.push(keys[0]);
  });

  return fieldNames;
}
