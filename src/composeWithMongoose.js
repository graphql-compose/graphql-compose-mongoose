/* @flow */
/* eslint-disable no-use-before-define, no-param-reassign */

import { TypeComposer, InputTypeComposer } from 'graphql-compose';
import composeWithConnection from 'graphql-compose-connection';
import { convertModelToGraphQL } from './fieldsConverter';
import * as resolvers from './resolvers';
import {
  getUniqueIndexes,
  extendByReversedIndexes,
} from './utils/getIndexesFromModel';

import type {
  MongooseModelT,
  typeConverterOpts,
  typeConverterResolversOpts,
  typeConverterInputTypeOpts,
  connectionSortMapOpts,
} from './definition';


export function composeWithMongoose(
  model: MongooseModelT,
  opts: typeConverterOpts = {}
): TypeComposer {
  const name: string = (opts && opts.name) || model.modelName;

  const typeComposer = convertModelToGraphQL(model, name);

  if (opts.description) {
    typeComposer.setDescription(opts.description);
  }

  if (opts.fields) {
    prepareFields(typeComposer, opts.fields);
  }

  // $FlowFixMe
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
    const removeFields =
      Object.keys(typeComposer.getFields()).filter(fName => !onlyFieldNames.includes(fName));
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
    const removeFields =
      Object.keys(inputTypeComposer.getFields()).filter(fName => !onlyFieldNames.includes(fName));
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
  inputTypeOpts?: typeConverterInputTypeOpts = {}
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
  opts: typeConverterResolversOpts
): void {
  const names = resolvers.getAvailableNames();
  names.forEach((resolverName) => {
    if (!{}.hasOwnProperty.call(opts, resolverName) || opts[resolverName] !== false) {
      const createResolverFn = resolvers[resolverName];
      if (createResolverFn) {
        const resolver = createResolverFn(
          model,
          typeComposer,
          opts[resolverName] || {}
        );
        typeComposer.setResolver(resolverName, resolver);
      }
    }
  });

  if (!{}.hasOwnProperty.call(opts, 'connection') || opts.connection !== false) {
    prepareConnectionResolver(model, typeComposer, opts.connection ? opts.connection : {});
  }
}

export function prepareConnectionResolver(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts: connectionSortMapOpts
) {
  const uniqueIndexes = extendByReversedIndexes(getUniqueIndexes(model), { reversedFirst: true });
  const sortConfigs = {};
  uniqueIndexes.forEach((indexData) => {
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
        keys.forEach((k) => {
          if (!rawQuery[k]) rawQuery[k] = {};
          if (indexData[k] === 1) {
            rawQuery[k].$lt = cursorData[k];
          } else {
            rawQuery[k].$gt = cursorData[k];
          }
        });
      },
      afterCursorQuery: (rawQuery, cursorData) => {
        keys.forEach((k) => {
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
