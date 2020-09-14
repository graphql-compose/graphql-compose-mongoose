/* eslint-disable no-use-before-define, no-param-reassign, global-require */

import type { ObjectTypeComposer, InputTypeComposer, SchemaComposer } from 'graphql-compose';
import { schemaComposer as globalSchemaComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { convertModelToGraphQL } from './fieldsConverter';
import { resolverFactory, AllResolversOpts } from './resolvers';
import MongoID from './types/MongoID';
import { GraphQLResolveInfo } from 'graphql';

export type ComposeWithMongooseOpts<TContext> = {
  schemaComposer?: SchemaComposer<TContext>;
  name?: string;
  description?: string;
  fields?: {
    only?: string[];
    // rename?: { [oldName: string]: string },
    remove?: string[];
  };
  inputType?: TypeConverterInputTypeOpts;
  resolvers?: false | AllResolversOpts;
  /** You may customize document id */
  transformRecordId?: TransformRecordIdFn<TContext>;
};

export type TransformRecordIdFn<TContext = any> = (
  source: Document,
  context: TContext,
  info: GraphQLResolveInfo
) => any;

export type TypeConverterInputTypeOpts = {
  name?: string;
  description?: string;
  fields?: {
    only?: string[];
    remove?: string[];
    required?: string[];
  };
};

export function composeWithMongoose<TDoc extends Document, TContext = any>(
  model: Model<TDoc>,
  opts: ComposeWithMongooseOpts<TContext> = {}
): ObjectTypeComposer<TDoc, TContext> {
  const m: Model<any> = model;
  const name: string = (opts && opts.name) || m.modelName;

  const sc = opts.schemaComposer || globalSchemaComposer;
  sc.add(MongoID);

  if (sc.has(name)) {
    throw new Error(
      `You try to generate GraphQL Type with name ${name} from mongoose model but this type already exists in SchemaComposer. Please choose another type name "composeWithMongoose(model, { name: 'NewTypeName' })", or reuse existed type "schemaComposer.getOTC('TypeName')", or remove type from SchemaComposer before calling composeWithMongoose method "schemaComposer.delete('TypeName')".`
    );
  }
  if (sc.has(m.schema)) {
    // looks like you want to generate new TypeComposer from model
    // so remove cached model (which is used for cross-reference types)
    sc.delete(m.schema);
  }

  const tc = convertModelToGraphQL(m, name, sc);

  if (opts.description) {
    tc.setDescription(opts.description);
  }

  if (opts.fields) {
    prepareFields(tc, opts.fields);
  }

  createInputType(tc, opts.inputType);

  if (!{}.hasOwnProperty.call(opts, 'resolvers') || opts.resolvers !== false) {
    createResolvers(m, tc, opts.resolvers || {});
  }

  tc.makeFieldNonNull('_id');

  return tc;
}

export function prepareFields(
  tc: ObjectTypeComposer<any, any>,
  opts: {
    only?: string[];
    remove?: string[];
  }
): void {
  if (Array.isArray(opts.only)) {
    const onlyFieldNames: string[] = opts.only;
    const removeFields = Object.keys(tc.getFields()).filter(
      (fName) => onlyFieldNames.indexOf(fName) === -1
    );
    tc.removeField(removeFields);
  }
  if (opts.remove) {
    tc.removeField(opts.remove);
  }
}

export function prepareInputFields(
  inputTypeComposer: InputTypeComposer<any>,
  inputFieldsOpts: {
    only?: string[];
    remove?: string[];
    required?: string[];
  }
): void {
  if (Array.isArray(inputFieldsOpts.only)) {
    const onlyFieldNames: string[] = inputFieldsOpts.only;
    const removeFields = Object.keys(inputTypeComposer.getFields()).filter(
      (fName) => onlyFieldNames.indexOf(fName) === -1
    );
    inputTypeComposer.removeField(removeFields);
  }
  if (inputFieldsOpts.remove) {
    inputTypeComposer.removeField(inputFieldsOpts.remove);
  }
  if (inputFieldsOpts.required) {
    inputTypeComposer.makeFieldNonNull(inputFieldsOpts.required);
  }
}

export function createInputType(
  tc: ObjectTypeComposer<any, any>,
  inputTypeOpts: TypeConverterInputTypeOpts = {}
): void {
  const inputTypeComposer = tc.getInputTypeComposer();

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
  model: Model<any>,
  tc: ObjectTypeComposer<any, any>,
  opts: AllResolversOpts
): void {
  (Object.keys(resolverFactory) as any).forEach((resolverName: keyof typeof resolverFactory) => {
    if (!opts.hasOwnProperty(resolverName) || opts[resolverName] !== false) {
      const createResolverFn = resolverFactory[resolverName] as any;
      if (typeof createResolverFn === 'function') {
        const resolver = createResolverFn(model, tc, opts[resolverName] || {});
        if (resolver) {
          tc.setResolver(resolverName, resolver);
        }
      }
    }
  });
}
