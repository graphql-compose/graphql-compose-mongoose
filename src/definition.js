/* @flow */
/* eslint-disable */

import type { TypeComposer } from 'graphql-compose';
import type { connectionSortMapOpts as _connectionSortMapOpts} from 'graphql-compose-connection/lib/definition';
export type connectionSortMapOpts = _connectionSortMapOpts;

export type ObjectMap = { [optName: string]: any };

export type ComplexTypesT =
 'ARRAY' | 'EMBEDDED' | 'DOCUMENT_ARRAY' | 'ENUM' | 'REFERENCE' | 'MIXED' | 'SCALAR';

export type MongooseModelSchemaT = {
  paths: {
    [optName: string]: MongooseFieldT,
  },
  _indexes?: MonooseModelIndex[],
  _gqcTypeComposer?: TypeComposer,
}

export type MonooseModelIndex = [
  { [fieldName: string]: number | string },
  { [optionName: string]: mixed },
];

export type MongoosePseudoModelT = {
  _gqcTypeComposer?: TypeComposer,
  schema: MongooseModelSchemaT,
}

export type MongooseModelT = {
  modelName: string,
  schema: MongooseModelSchemaT,
  create(doc: Object | Object[]): Promise<Object>,
  findOne(conditions: ?Object, projection?: Object): MongooseQuery,
  findById(id: mixed, projection?: Object, options?: Object): MongooseQuery,
  find(conditions: ?Object, projection?: Object, options?: Object): MongooseQuery,
  findOneAndRemove(conditions: ?Object, options?: Object): MongooseQuery,
  where(conditions: ObjectMap): MongooseQuery,
  findByIdAndRemove(id: mixed, options?: Object): MongooseQuery,
  findOneAndRemove(conditions: ?Object, options?: Object): MongooseQuery,
}

export type MongooseFieldOptionsT = {
  description: ?string,
}

export type MongooseFieldT = {
  path: string,
  instance: string,
  caster?: ?MongooseFieldT,
  options?: ?MongooseFieldOptionsT,
  enumValues?: ?string[],
  schema: MongooseModelSchemaT,
};

export type MongooseFieldMapT = { [fieldName: string]: MongooseFieldT };

export type ResolverNames = 'findById' | 'findByIds' | 'findOne' | 'findMany' |
                            'updateById' | 'updateOne' | 'updateMany' |
                            'removeById' | 'removeOne' | 'removeMany' |
                            'createOne' | 'count' | 'connection';

export type MongooseQuery = {
  exec(): Promise<any>,
  where(criteria: ObjectMap): MongooseQuery,
  // where(fieldName: string, equalTo: string): MongooseQuery,
  skip(num: number): MongooseQuery,
  limit(num: number): MongooseQuery,
  select(projection: ObjectMap): MongooseQuery,
  sort(fields: ObjectMap): MongooseQuery,
  setOptions(opts: ObjectMap): MongooseQuery,
  update(data: ObjectMap): MongooseQuery,
  remove(conditions: ?Object, options?: Object): MongooseQuery,
  count(conditions: ?Object): MongooseQuery,
  schema: MongooseModelSchemaT,
};

export type MongoseDocument = {
  set(values: ObjectMap): void,
  save(): Promise<Object>,
}

// RE-EXPORT graphql-compose definitions
import type {
  GraphQLObjectType as _GraphQLObjectType,
  GraphQLOutputType as _GraphQLOutputType,
  ResolveParams as _ResolveParams,
  GraphQLFieldConfigArgumentMap as _GraphQLFieldConfigArgumentMap,
  ResolverMWResolveFn as _ResolverMWResolveFn,
  GraphQLResolveInfo as _GraphQLResolveInfo,
} from 'graphql-compose/lib/definition.js';

export type GraphQLObjectType = _GraphQLObjectType;
export type GraphQLOutputType = _GraphQLOutputType;
export type GraphQLFieldConfigArgumentMap = _GraphQLFieldConfigArgumentMap;
export type ResolveParams<TSource, TContext> = _ResolveParams<TSource, TContext>;
export type GraphQLResolveInfo = _GraphQLResolveInfo;
export type ResolverMWResolveFn<TSource, TContext> = _ResolverMWResolveFn<TSource, TContext>;
export type ExtendedResolveParams = $Shape<ResolveParams<*, *>> & {
  query: MongooseQuery,
  rawQuery: ObjectMap,
  beforeQuery?: (query: mixed, rp: ExtendedResolveParams) => Promise<*>,
  beforeRecordMutate?: (record: mixed, rp: ExtendedResolveParams) => Promise<*>,
};


// HELPERS OPTIONS

export type genResolverOpts = {
  filter?: filterHelperArgsOpts,
  sort?: sortHelperArgsOpts,
  record?: recordHelperArgsOpts,
  limit?: limitHelperArgsOpts,
}


export type typeConverterOpts = {
  name?: string,
  description?: string,
  fields?: {
    only?: string[],
    // rename?: { [oldName: string]: string },
    remove?: string[],
  },
  inputType?: typeConverterInputTypeOpts,
  resolvers?: false | typeConverterResolversOpts,
};

export type typeConverterInputTypeOpts = {
  name?: string,
  description?: string,
  fields?: {
    only?: string[],
    remove?: string[],
    required?: string[]
  },
};

export type typeConverterResolversOpts = {
  findById?: false,
  findByIds?: false | {
    limit?: limitHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
  },
  findOne?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    skip?: false,
  },
  findMany?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    limit?: limitHelperArgsOpts | false,
    skip?: false,
  },
  updateById?: false | {
    input?: recordHelperArgsOpts | false,
  },
  updateOne?: false | {
    input?: recordHelperArgsOpts | false,
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    skip?: false,
  },
  updateMany?: false | {
    input?: recordHelperArgsOpts | false,
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    limit?: limitHelperArgsOpts | false,
    skip?: false,
  },
  removeById?: false,
  removeOne?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
  },
  removeMany?: false | {
    filter?: filterHelperArgsOpts | false,
  },
  createOne?: false | {
    input?: recordHelperArgsOpts | false,
  },
  count?: false | {
    filter?: filterHelperArgsOpts | false,
  },
  connection?: connectionSortMapOpts | false,
};

export type filterHelperArgsOpts = {
  filterTypeName?: string,
  isRequired?: boolean,
  onlyIndexed?: boolean,
  requiredFields?: string | string[],
  operators?: filterOperatorsOpts | false,
  removeFields?: string | string[],
};

export type filterOperatorNames =  'gt' | 'gte' | 'lt' | 'lte' | 'ne' | 'in[]' | 'nin[]';

export type filterOperatorsOpts = {
  [fieldName: string]: filterOperatorNames[] | false,
};

export type sortHelperArgsOpts = {
  sortTypeName?: string,
};

export type recordHelperArgsOpts = {
  recordTypeName?: string,
  isRequired?: boolean,
  removeFields?: string[],
  requiredFields?: string[],
};

export type limitHelperArgsOpts = {
  defaultValue?: number,
};
