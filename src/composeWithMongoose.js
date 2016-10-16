/* @flow */
/* eslint-disable no-use-before-define, no-param-reassign */

import { TypeComposer, InputTypeComposer } from 'graphql-compose';
import composeWithConnection from 'graphql-compose-connection';
import { convertModelToGraphQL } from './fieldsConverter';
import * as resolvers from './resolvers';

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
    inputTypeComposer.makeFieldsRequired(inputFieldsOpts.required);
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
    prepareConnectionResolver(typeComposer, opts.connection ? opts.connection : {});
  }
}

export function prepareConnectionResolver(
  typeComposer: TypeComposer,
  opts: connectionSortMapOpts
) {
  composeWithConnection(typeComposer, {
    findResolverName: 'findMany',
    countResolverName: 'count',
    sort: {
      _ID_DESC: {
        value: { _id: -1 },
        cursorFields: ['_id'],
        beforeCursorQuery: (rawQuery, cursorData) => {
          // $FlowFixMe
          if (!rawQuery._id) rawQuery._id = {};
          // $FlowFixMe
          rawQuery._id.$gt = cursorData._id;
        },
        afterCursorQuery: (rawQuery, cursorData) => {
          // $FlowFixMe
          if (!rawQuery._id) rawQuery._id = {};
          // $FlowFixMe
          rawQuery._id.$lt = cursorData._id;
        },
      },
      _ID_ASC: {
        value: { _id: 1 },
        cursorFields: ['_id'],
        beforeCursorQuery: (rawQuery, cursorData) => {
          // $FlowFixMe
          if (!rawQuery._id) rawQuery._id = {};
          // $FlowFixMe
          rawQuery._id.$gt = cursorData._id;
        },
        afterCursorQuery: (rawQuery, cursorData) => {
          // $FlowFixMe
          if (!rawQuery._id) rawQuery._id = {};
          // $FlowFixMe
          rawQuery._id.$lt = cursorData._id;
        },
      },
      ...opts,
    },
  });
}
