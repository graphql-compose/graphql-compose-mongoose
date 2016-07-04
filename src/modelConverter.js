/* @flow */
/* eslint-disable no-use-before-define */

import { convertModelToGraphQL } from './fieldsConverter';
import { TypeComposer, InputTypeComposer } from 'graphql-compose';
import * as resolvers from './resolvers';

import type {
  MongooseModelT,
  typeConverterOpts,
  typeConverterResolversOpts,
  typeConverterInputTypeOpts,
} from './definition';


export function mongooseModelToTypeComposer(
  model: MongooseModelT,
  opts: typeConverterOpts = {}
): TypeComposer {
  const name: string = (opts && opts.name) || model.modelName;

  const type = convertModelToGraphQL(model, name);
  const typeComposer = new TypeComposer(type);

  if (opts.description) {
    typeComposer.setDescription(opts.description);
  }

  if (opts.fields) {
    prepareFields(typeComposer, opts.fields);
  }

  typeComposer.setRecordIdFn((source) => `${source._id}`);

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
      const resolver = createResolverFn(
        model,
        typeComposer,
        opts[resolverName] || {}
      );
      typeComposer.setResolver(resolver);
    }
  });
}
