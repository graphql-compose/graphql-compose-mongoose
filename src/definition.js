/* @flow */
/* eslint-disable */

export type ObjectMap = { [optName: string]: mixed };

// RESOLVER -----------------------------
// export type ResolverMWMethodKeys = 'args' | 'resolve' | 'outputType';
//
// export type ResolverMWArgsFn = (args: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
// export type ResolverMWArgs = (next: ResolverMWArgsFn) => ResolverMWArgsFn;
//
// export type ResolverMWResolveFn = (resolveParams: ResolveParams) => mixed;
// export type ResolverMWResolve = (next: ResolverMWResolveFn) => ResolverMWResolveFn;
//
// export type ResolverMWOutputTypeFn = (outputType: GraphQLOutputType) => GraphQLOutputType;
// export type ResolverMWOutputType = (next: ResolverMWOutputTypeFn) => ResolverMWOutputTypeFn;
//
// export type ResolverFieldConfig = {
//   type: GraphQLOutputType,
//   args: GraphQLFieldConfigArgumentMap,
//   resolve: GraphQLFieldResolveFn
// };

export type GraphQLOutputType = mixed;

export type ComplexTypesT =
 'ARRAY' | 'EMBEDDED' | 'DOCUMENT_ARRAY' | 'ENUM' | 'REFERENCE' | 'SCALAR';

export type MongooseModelSchemaT = {
  paths: ObjectMap,
}

export type MongooseModelT = {
  schema: MongooseModelSchemaT,
}

export type MongooseFieldOptionsT = {
  description: ?string,
}

export type MongooseFieldT = {
  path: string,
  instance: string,
  caster: ?MongooseFieldT,
  options: ?MongooseFieldOptionsT,
}

export type MongooseFieldMapT = { [fieldName: string]: MongooseFieldT };
