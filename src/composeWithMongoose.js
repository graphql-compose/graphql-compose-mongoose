/* @flow */
/* eslint-disable no-use-before-define, no-param-reassign, global-require */

import { TypeComposer, InputTypeComposer } from 'graphql-compose';
import { convertModelToGraphQL } from './fieldsConverter';
import * as resolvers from './resolvers';
import { getUniqueIndexes, extendByReversedIndexes } from './utils/getIndexesFromModel';

import type {
  MongooseModelT,
  TypeConverterOpts,
  TypeConverterResolversOpts,
  TypeConverterInputTypeOpts,
  ConnectionSortMapOpts,
  PaginationOpts,
} from './definition';

export function composeWithMongoose(
  model: Object, // MongooseModelT, TODO use Model from mongoose_v4.x.x definition when it will be public
  opts: TypeConverterOpts = {}
): TypeComposer {
  const name: string = (opts && opts.name) || model.modelName;

  const typeComposer = convertModelToGraphQL(model, name);

  if (opts.description) {
    typeComposer.setDescription(opts.description);
  }

  if (opts.fields) {
    prepareFields(typeComposer, opts.fields);
  }

  typeComposer.setRecordIdFn(source => (source ? `${source._id}` : ''));

  createInputType(typeComposer, opts.inputType);

  if (!{}.hasOwnProperty.call(opts, 'resolvers') || opts.resolvers !== false) {
    createResolvers(model, typeComposer, opts.resolvers || {});
  }

  return typeComposer;
}

export function prepareFields(
  typeComposer: TypeComposer,
  opts: {
    only?: string[],
    remove?: string[],
  }
) {
  if (Array.isArray(opts.only)) {
    const onlyFieldNames: string[] = opts.only;
    const removeFields = Object.keys(typeComposer.getFields()).filter(
      fName => onlyFieldNames.indexOf(fName) === -1
    );
    typeComposer.removeField(removeFields);
  }
  if (opts.remove) {
    typeComposer.removeField(opts.remove);
  }
}

export function prepareInputFields(
  inputTypeComposer: InputTypeComposer,
  inputFieldsOpts: {
    only?: string[],
    remove?: string[],
    required?: string[],
  }
) {
  if (Array.isArray(inputFieldsOpts.only)) {
    const onlyFieldNames: string[] = inputFieldsOpts.only;
    const removeFields = Object.keys(inputTypeComposer.getFields()).filter(
      fName => onlyFieldNames.indexOf(fName) === -1
    );
    inputTypeComposer.removeField(removeFields);
  }
  if (inputFieldsOpts.remove) {
    inputTypeComposer.removeField(inputFieldsOpts.remove);
  }
  if (inputFieldsOpts.required) {
    inputTypeComposer.makeRequired(inputFieldsOpts.required);
  }
}

export function createInputType(
  typeComposer: TypeComposer,
  inputTypeOpts?: TypeConverterInputTypeOpts = {}
): void {
  const inputTypeComposer = typeComposer.getInputTypeComposer();

  if (inputTypeOpts.name) {
    inputTypeComposer.setTypeName(inputTypeOpts.name);
  }

  if (inputTypeOpts.description) {
    inputTypeComposer.setDescription(inputTypeOpts.description);
  }

  if (inputTypeOpts.fields) {
    prepareInputFields(inputTypeComposer, inputTypeOpts.fields);
  }
}

export function createResolvers(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts: TypeConverterResolversOpts
): void {
  const names = resolvers.getAvailableNames();
  names.forEach(resolverName => {
    if (!{}.hasOwnProperty.call(opts, resolverName) || opts[resolverName] !== false) {
      const createResolverFn = resolvers[resolverName];
      if (createResolverFn) {
        const resolver = createResolverFn(model, typeComposer, opts[resolverName] || {});
        typeComposer.setResolver(resolverName, resolver);
      }
    }
  });

  if (!{}.hasOwnProperty.call(opts, 'connection') || opts.connection !== false) {
    prepareConnectionResolver(model, typeComposer, opts.connection ? opts.connection : {});
  }

  if (!{}.hasOwnProperty.call(opts, 'pagination') || opts.pagination !== false) {
    preparePaginationResolver(typeComposer, opts.pagination || {});
  }
}

export function preparePaginationResolver(typeComposer: TypeComposer, opts: PaginationOpts) {
  try {
    require.resolve('graphql-compose-pagination');
  } catch (e) {
    return;
  }
  const composeWithPagination = require('graphql-compose-pagination').default;
  composeWithPagination(typeComposer, {
    findResolverName: 'findMany',
    countResolverName: 'count',
    ...opts,
  });
}

export function prepareConnectionResolver(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts: ConnectionSortMapOpts
) {
  try {
    require.resolve('graphql-compose-connection');
  } catch (e) {
    return;
  }
  const composeWithConnection = require('graphql-compose-connection').default;

  const uniqueIndexes = extendByReversedIndexes(getUniqueIndexes(model), {
    reversedFirst: true,
  });
  const sortConfigs = {};
  uniqueIndexes.forEach(indexData => {
    const keys = Object.keys(indexData);
    let name = keys.join('__').toUpperCase().replace(/[^_a-zA-Z0-9]/i, '__');
    if (indexData[keys[0]] === 1) {
      name = `${name}_ASC`;
    } else if (indexData[keys[0]] === -1) {
      name = `${name}_DESC`;
    }
    sortConfigs[name] = {
      value: indexData,
      cursorFields: keys,
      beforeCursorQuery: (rawQuery, cursorData) => {
        keys.forEach(k => {
          if (!rawQuery[k]) rawQuery[k] = {};
          if (indexData[k] === 1) {
            rawQuery[k].$lt = cursorData[k];
          } else {
            rawQuery[k].$gt = cursorData[k];
          }
        });
      },
      afterCursorQuery: (rawQuery, cursorData) => {
        keys.forEach(k => {
          if (!rawQuery[k]) rawQuery[k] = {};
          if (indexData[k] === 1) {
            rawQuery[k].$gt = cursorData[k];
          } else {
            rawQuery[k].$lt = cursorData[k];
          }
        });
      },
    };
  });

  composeWithConnection(typeComposer, {
    findResolverName: 'findMany',
    countResolverName: 'count',
    sort: {
      ...sortConfigs,
      ...opts,
    },
  });
}
