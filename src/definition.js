/* @flow */
/* eslint-disable */

export type ObjectMap = { [optName: string]: any };

export type ComplexTypesT =
 'ARRAY' | 'EMBEDDED' | 'DOCUMENT_ARRAY' | 'ENUM' | 'REFERENCE' | 'SCALAR';

export type MongooseModelSchemaT = {
  paths: {
    [optName: string]: MongooseFieldT,
  },
  _indexes?: MonooseModelIndex[],
}

export type MonooseModelIndex = [
  { [fieldName: string]: number | string },
  { [optionName: string]: mixed },
];

export type MongooseModelT = {
  schema: MongooseModelSchemaT,
  findOne(criteria: ?Object, projection?: Object): MongooseQuery,
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
} | MongooseModelT;

export type MongooseFieldMapT = { [fieldName: string]: MongooseFieldT };

export type ResolverNames = 'byId' | 'byIds' | 'findOne' | 'findMany' |
                            'updateOne' | 'updateMany' | 'removeOne' | 'removeMany';

export type MongooseQuery = {
  exec(): Promise,
  where(criteria: ObjectMap): MongooseQuery,
  where(fieldName: string, equalTo: string): MongooseQuery,
  where(fieldName: string): MongooseQuery,
  skip(num: number): MongooseQuery,
  limit(num: number): MongooseQuery,
  select(projection: ObjectMap): MongooseQuery,
  sort(fields: ObjectMap): MongooseQuery,
};

export type MongoseDocument = {
  set(values: ObjectMap): void,
  save(): Promise,
}

// RE-EXPORT graphql-compose definitions
import type {
  GraphQLObjectType as _GraphQLObjectType,
  GraphQLOutputType as _GraphQLOutputType,
  InputObjectConfigFieldMap as _InputObjectConfigFieldMap,
  ResolveParams as _ResolveParams,
  GraphQLFieldConfigArgumentMap as _GraphQLFieldConfigArgumentMap,
  ResolverMWResolveFn as _ResolverMWResolveFn,
} from '../../graphql-compose/src/definition';

export type GraphQLObjectType = _GraphQLObjectType;
export type GraphQLOutputType = _GraphQLOutputType;
export type InputObjectConfigFieldMap = _InputObjectConfigFieldMap;
export type GraphQLFieldConfigArgumentMap = _GraphQLFieldConfigArgumentMap;
export type ResolveParams = _ResolveParams;
export type ResolverMWResolveFn = _ResolverMWResolveFn;
export type ExtendedResolveParams = ResolveParams & {
  query: MongooseQuery,
};
