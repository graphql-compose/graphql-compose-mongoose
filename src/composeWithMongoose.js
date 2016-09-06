/* @flow */
/* eslint-disable no-use-before-define, no-param-reassign */

import { TypeComposer, InputTypeComposer } from 'graphql-compose';
import composeWithConnection from 'graphql-compose-connection';
import { convertModelToGraphQL } from './fieldsConverter';
import * as resolvers from './resolvers';
import { OPERATORS_FIELDNAME } from './resolvers/helpers/filter';

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

  if (!opts.hasOwnProperty('resolvers') || opts.resolvers !== false) {
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
  names.forEach(resolverName => {
    if (!opts.hasOwnProperty(resolverName) || opts[resolverName] !== false) {
      const createResolverFn = resolvers[resolverName];
      if (createResolverFn) {
        const resolver = createResolverFn(
          model,
          typeComposer,
          opts[resolverName] || {}
        );
        typeComposer.setResolver(resolver);
      }
    }
  });

  if (!opts.hasOwnProperty('connection') || opts.connection !== false) {
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
        uniqueFields: ['_id'],
        sortValue: { _id: -1 },
        directionFilter: (filter, cursorData, isBefore) => {
          // $FlowFixMe
          filter[OPERATORS_FIELDNAME] = filter[OPERATORS_FIELDNAME] || {};
          // $FlowFixMe
          filter[OPERATORS_FIELDNAME]._id = filter[OPERATORS_FIELDNAME]._id || {};
          if (isBefore) {
            filter[OPERATORS_FIELDNAME]._id.gt = cursorData._id;
          } else {
            filter[OPERATORS_FIELDNAME]._id.lt = cursorData._id;
          }
          // $FlowFixMe
          return filter;
        },
      },
      _ID_ASC: {
        uniqueFields: ['_id'],
        sortValue: { _id: 1 },
        directionFilter: (filter, cursorData, isBefore) => {
          // $FlowFixMe
          filter[OPERATORS_FIELDNAME] = filter[OPERATORS_FIELDNAME] || {};
          // $FlowFixMe
          filter[OPERATORS_FIELDNAME]._id = filter[OPERATORS_FIELDNAME]._id || {};
          if (isBefore) {
            filter[OPERATORS_FIELDNAME]._id.lt = cursorData._id;
          } else {
            filter[OPERATORS_FIELDNAME]._id.gt = cursorData._id;
          }
          // $FlowFixMe
          return filter;
        },
      },
      ...opts,
    },
  });
}
