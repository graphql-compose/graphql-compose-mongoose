/* @flow */
/* eslint-disable no-use-before-define */

import type { MongooseModel } from 'mongoose';
import type {
  ObjectTypeComposerArgumentConfigMapDefinition,
  ObjectTypeComposer,
  SchemaComposer,
  EnumTypeComposer,
} from 'graphql-compose';
import { getIndexesFromModel, extendByReversedIndexes } from '../../utils/getIndexesFromModel';
import type { ExtendedResolveParams } from '../index';

export type SortHelperArgsOpts = {
  sortTypeName?: string,
};

export const sortHelperArgs = (
  tc: ObjectTypeComposer<any, any>,
  model: MongooseModel,
  opts?: SortHelperArgsOpts
): ObjectTypeComposerArgumentConfigMapDefinition<> => {
  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('First arg for sortHelperArgs() should be instance of ObjectTypeComposer.');
  }

  if (!model || !model.modelName || !model.schema) {
    throw new Error('Second arg for sortHelperArgs() should be instance of Mongoose Model.');
  }

  if (!opts || !opts.sortTypeName) {
    throw new Error('You should provide non-empty `sortTypeName` in options for sortHelperArgs().');
  }

  const gqSortType = getSortTypeFromModel(opts.sortTypeName, model, tc.schemaComposer);

  return {
    sort: {
      type: gqSortType,
    },
  };
};

export function sortHelper(resolveParams: ExtendedResolveParams): void {
  const sort = resolveParams && resolveParams.args && resolveParams.args.sort;
  if (sort && typeof sort === 'object' && Object.keys(sort).length > 0) {
    resolveParams.query = resolveParams.query.sort(sort); // eslint-disable-line
  }
}

export function getSortTypeFromModel<TContext>(
  typeName: string,
  model: MongooseModel,
  schemaComposer: SchemaComposer<TContext>
): EnumTypeComposer<TContext> {
  return schemaComposer.getOrCreateETC(typeName, etc => {
    const indexes = extendByReversedIndexes(getIndexesFromModel(model));
    const fields = {};
    indexes.forEach(indexData => {
      const keys = Object.keys(indexData);
      let name = keys
        .join('__')
        .toUpperCase()
        .replace(/[^_a-zA-Z0-9]/gi, '__');
      if (indexData[keys[0]] === 1) {
        name = `${name}_ASC`;
      } else if (indexData[keys[0]] === -1) {
        name = `${name}_DESC`;
      }
      fields[name] = {
        name,
        value: indexData,
      };
    });

    etc.setFields(fields);
  });
}
