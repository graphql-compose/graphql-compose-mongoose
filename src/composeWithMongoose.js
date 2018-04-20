/* @flow */
/* eslint-disable no-use-before-define, no-param-reassign, global-require */

import type { TypeComposer, InputTypeComposer, SchemaComposer } from 'graphql-compose';
import { schemaComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import type { ConnectionSortMapOpts } from 'graphql-compose-connection';
import { convertModelToGraphQL } from './fieldsConverter';
import * as resolvers from './resolvers';
import { prepareConnectionResolver } from './prepareConnectionResolver';
import type {
  FilterHelperArgsOpts,
  LimitHelperArgsOpts,
  SortHelperArgsOpts,
  RecordHelperArgsOpts,
} from './resolvers/helpers';
import MongoID from './types/mongoid';

export type TypeConverterOpts = {
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
};

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
        input?: RecordHelperArgsOpts | false,
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
        input?: RecordHelperArgsOpts | false,
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
        input?: RecordHelperArgsOpts | false,
      },
  count?:
    | false
    | {
        filter?: FilterHelperArgsOpts | false,
      },
  connection?: ConnectionSortMapOpts | false,
  pagination?: PaginationResolverOpts | false,
};

export type PaginationResolverOpts = {
  perPage?: number,
};

export function composeWithMongoose(
  model: Object, // MongooseModel, TODO use Model from mongoose_v4.x.x definition when it will be public
  opts: TypeConverterOpts = {}
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
        tc.setResolver(resolverName, resolver);
      }
    }
  });

  if (!{}.hasOwnProperty.call(opts, 'connection') || opts.connection !== false) {
    prepareConnectionResolver(model, tc, opts.connection ? opts.connection : {});
  }

  if (!{}.hasOwnProperty.call(opts, 'pagination') || opts.pagination !== false) {
    preparePaginationResolver(tc, opts.pagination || {});
  }
}

export function preparePaginationResolver(tc: TypeComposer, opts: PaginationResolverOpts) {
  try {
    require.resolve('graphql-compose-pagination');
  } catch (e) {
    return;
  }
  const composeWithPagination = require('graphql-compose-pagination').default;
  composeWithPagination(tc, {
    findResolverName: 'findMany',
    countResolverName: 'count',
    ...opts,
  });
}
