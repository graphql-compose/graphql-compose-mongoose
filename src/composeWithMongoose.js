/* @flow */
/* eslint-disable no-use-before-define, no-param-reassign, global-require */

import type { TypeComposer, InputTypeComposer, SchemaComposer } from 'graphql-compose';
import { schemaComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { convertModelToGraphQL } from './fieldsConverter';
import * as resolvers from './resolvers';
import type {
  FilterHelperArgsOpts,
  LimitHelperArgsOpts,
  SortHelperArgsOpts,
  RecordHelperArgsOpts,
} from './resolvers/helpers';
import MongoID from './types/mongoid';
import type { PaginationResolverOpts } from './resolvers/pagination';
import type { ConnectionSortMapOpts } from './resolvers/connection';

export type TypeConverterOpts = {|
  schemaComposer?: SchemaComposer<any>,
  name?: string,
  description?: string,
  fields?: {
    only?: string[],
    // rename?: { [oldName: string]: string },
    remove?: string[],
  },
  inputType?: TypeConverterInputTypeOpts,
  resolvers?: false | TypeConverterResolversOpts,
|};

export type TypeConverterInputTypeOpts = {
  name?: string,
  description?: string,
  fields?: {
    only?: string[],
    remove?: string[],
    required?: string[],
  },
};

export type TypeConverterResolversOpts = {
  findById?: false,
  findByIds?:
    | false
    | {
        limit?: LimitHelperArgsOpts | false,
        sort?: SortHelperArgsOpts | false,
      },
  findOne?:
    | false
    | {
        filter?: FilterHelperArgsOpts | false,
        sort?: SortHelperArgsOpts | false,
        skip?: false,
      },
  findMany?:
    | false
    | {
        filter?: FilterHelperArgsOpts | false,
        sort?: SortHelperArgsOpts | false,
        limit?: LimitHelperArgsOpts | false,
        skip?: false,
      },
  updateById?:
    | false
    | {
        record?: RecordHelperArgsOpts | false,
      },
  updateOne?:
    | false
    | {
        input?: RecordHelperArgsOpts | false,
        filter?: FilterHelperArgsOpts | false,
        sort?: SortHelperArgsOpts | false,
        skip?: false,
      },
  updateMany?:
    | false
    | {
        record?: RecordHelperArgsOpts | false,
        filter?: FilterHelperArgsOpts | false,
        sort?: SortHelperArgsOpts | false,
        limit?: LimitHelperArgsOpts | false,
        skip?: false,
      },
  removeById?: false,
  removeOne?:
    | false
    | {
        filter?: FilterHelperArgsOpts | false,
        sort?: SortHelperArgsOpts | false,
      },
  removeMany?:
    | false
    | {
        filter?: FilterHelperArgsOpts | false,
      },
  createOne?:
    | false
    | {
        record?: RecordHelperArgsOpts | false,
      },
  createMany?:
    | false
    | {
        records?: RecordHelperArgsOpts | false,
      },
  count?:
    | false
    | {
        filter?: FilterHelperArgsOpts | false,
      },
  connection?: ConnectionSortMapOpts | false,
  pagination?: PaginationResolverOpts | false,
};

export function composeWithMongoose(
  model: Object, // MongooseModel, TODO use Model from mongoose_v4.x.x definition when it will be public
  opts: TypeConverterOpts = ({}: any)
): TypeComposer {
  const name: string = (opts && opts.name) || model.modelName;

  const sc = opts.schemaComposer || schemaComposer;
  sc.set('MongoID', MongoID);
  const tc = convertModelToGraphQL(model, name, sc);

  if (opts.description) {
    tc.setDescription(opts.description);
  }

  if (opts.fields) {
    prepareFields(tc, opts.fields);
  }

  tc.setRecordIdFn(source => (source ? `${source._id}` : ''));

  createInputType(tc, opts.inputType);

  if (!{}.hasOwnProperty.call(opts, 'resolvers') || opts.resolvers !== false) {
    createResolvers(model, tc, opts.resolvers || {});
  }

  tc.makeFieldNonNull('_id');

  return tc;
}

export function prepareFields(
  tc: TypeComposer,
  opts: {
    only?: string[],
    remove?: string[],
  }
) {
  if (Array.isArray(opts.only)) {
    const onlyFieldNames: string[] = opts.only;
    const removeFields = Object.keys(tc.getFields()).filter(
      fName => onlyFieldNames.indexOf(fName) === -1
    );
    tc.removeField(removeFields);
  }
  if (opts.remove) {
    tc.removeField(opts.remove);
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
  tc: TypeComposer,
  inputTypeOpts?: TypeConverterInputTypeOpts = {}
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
  model: MongooseModel,
  tc: TypeComposer,
  opts: TypeConverterResolversOpts
): void {
  const names = resolvers.getAvailableNames();
  names.forEach(resolverName => {
    if (!{}.hasOwnProperty.call(opts, resolverName) || opts[resolverName] !== false) {
      const createResolverFn = resolvers[resolverName];
      if (createResolverFn) {
        const resolver = createResolverFn(model, tc, opts[resolverName] || {});
        if (resolver) {
          tc.setResolver(resolverName, resolver);
        }
      }
    }
  });
}
