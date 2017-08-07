/* @flow */
/* eslint-disable */

import type { TypeComposer } from 'graphql-compose';
import type { ConnectionSortMapOpts as _ConnectionSortMapOpts} from 'graphql-compose-connection/lib/definition';

export type ConnectionSortMapOpts = _ConnectionSortMapOpts;

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
  path?: string,
  instance: string,
  caster?: ?MongooseFieldT,
  options?: ?MongooseFieldOptionsT,
  enumValues?: ?string[],
  schema?: MongooseModelSchemaT,
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
  ComposeFieldConfigArgumentMap as _ComposeFieldConfigArgumentMap,
  ResolverMWResolveFn as _ResolverMWResolveFn,
  GraphQLResolveInfo as _GraphQLResolveInfo,
} from 'graphql-compose/lib/definition.js';

export type GraphQLObjectType = _GraphQLObjectType;
export type GraphQLOutputType = _GraphQLOutputType;
export type ComposeFieldConfigArgumentMap = _ComposeFieldConfigArgumentMap;
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

export type GenResolverOpts = {
  filter?: FilterHelperArgsOpts,
  sort?: SortHelperArgsOpts,
  record?: RecordHelperArgsOpts,
  limit?: LimitHelperArgsOpts,
}


export type TypeConverterOpts = {
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
    required?: string[]
  },
};

export type TypeConverterResolversOpts = {
  findById?: false,
  findByIds?: false | {
    limit?: LimitHelperArgsOpts | false,
    sort?: SortHelperArgsOpts | false,
  },
  findOne?: false | {
    filter?: FilterHelperArgsOpts | false,
    sort?: SortHelperArgsOpts | false,
    skip?: false,
  },
  findMany?: false | {
    filter?: FilterHelperArgsOpts | false,
    sort?: SortHelperArgsOpts | false,
    limit?: LimitHelperArgsOpts | false,
    skip?: false,
  },
  updateById?: false | {
    input?: RecordHelperArgsOpts | false,
  },
  updateOne?: false | {
    input?: RecordHelperArgsOpts | false,
    filter?: FilterHelperArgsOpts | false,
    sort?: SortHelperArgsOpts | false,
    skip?: false,
  },
  updateMany?: false | {
    input?: RecordHelperArgsOpts | false,
    filter?: FilterHelperArgsOpts | false,
    sort?: SortHelperArgsOpts | false,
    limit?: LimitHelperArgsOpts | false,
    skip?: false,
  },
  removeById?: false,
  removeOne?: false | {
    filter?: FilterHelperArgsOpts | false,
    sort?: SortHelperArgsOpts | false,
  },
  removeMany?: false | {
    filter?: FilterHelperArgsOpts | false,
  },
  createOne?: false | {
    input?: RecordHelperArgsOpts | false,
  },
  count?: false | {
    filter?: FilterHelperArgsOpts | false,
  },
  connection?: ConnectionSortMapOpts | false,
  pagination?: { perPage?: number } | false,
};

export type FilterHelperArgsOpts = {
  filterTypeName?: string,
  isRequired?: boolean,
  onlyIndexed?: boolean,
  requiredFields?: string | string[],
  operators?: FilterOperatorsOpts | false,
  removeFields?: string | string[],
};

export type FilterOperatorNames =  'gt' | 'gte' | 'lt' | 'lte' | 'ne' | 'in[]' | 'nin[]';

export type FilterOperatorsOpts = {
  [fieldName: string]: FilterOperatorNames[] | false,
};

export type SortHelperArgsOpts = {
  sortTypeName?: string,
};

export type RecordHelperArgsOpts = {
  recordTypeName?: string,
  isRequired?: boolean,
  removeFields?: string[],
  requiredFields?: string[],
};

export type LimitHelperArgsOpts = {
  defaultValue?: number,
};
