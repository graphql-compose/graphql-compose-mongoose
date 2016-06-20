/* @flow */
/* eslint-disable */

export type ObjectMap = { [optName: string]: mixed };

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
  caster?: ?MongooseFieldT,
  options?: ?MongooseFieldOptionsT,
  enumValues?: ?string[],
} & MongooseModelT;

export type MongooseFieldMapT = { [fieldName: string]: MongooseFieldT };
