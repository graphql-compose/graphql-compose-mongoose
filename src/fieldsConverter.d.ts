import {
  EnumTypeComposer,
  SchemaComposer,
  TypeComposer,
} from 'graphql-compose';
import { GraphQLScalarType } from 'graphql-compose/lib/graphql';
import { Model, Schema } from 'mongoose';

// @ts-todo MongooseSchemaField<any> in the Flow version, MongooseSchemaField isn't there in mongoose's .d.ts
type MongooseFieldT = any;

type MongooseFieldMapT = { [fieldName: string]: MongooseFieldT };
type ComposeScalarType = string | GraphQLScalarType;

type ComposeOutputType =
  | TypeComposer<any>
  | ComposeScalarType
  | EnumTypeComposer
  | [TypeComposer<any> | ComposeScalarType | EnumTypeComposer];

export type MongoosePseudoModelT = {
  schema: Schema;
};

export const ComplexTypes: {
  ARRAY: 'ARRAY';
  EMBEDDED: 'EMBEDDED';
  DOCUMENT_ARRAY: 'DOCUMENT_ARRAY';
  ENUM: 'ENUM';
  REFERENCE: 'REFERENCE';
  SCALAR: 'SCALAR';
  MIXED: 'MIXED';
};

export function dotPathsToEmbedded(
  fields: MongooseFieldMapT,
): MongooseFieldMapT;

export function getFieldsFromModel(
  model: Model<any> | MongoosePseudoModelT,
): MongooseFieldMapT;

export function convertModelToGraphQL(
  model: Model<any> | MongoosePseudoModelT,
  typeName: string,
  sc?: SchemaComposer<any>,
): TypeComposer<any>;

export function convertSchemaToGraphQL<TContext = any>(
  schema: Schema,
  typeName: string,
  sc?: SchemaComposer<TContext>,
): TypeComposer<any, TContext>;

export function convertFieldToGraphQL(
  field: MongooseFieldT,
  prefix: string | undefined,
  schemaComposer: SchemaComposer<any>,
): ComposeOutputType;

export function deriveComplexType(
  field: MongooseFieldT,
): keyof typeof ComplexTypes;

export function scalarToGraphQL(field: MongooseFieldT): ComposeScalarType;

export function arrayToGraphQL(
  field: MongooseFieldT,
  prefix: string | undefined,
  schemaComposer: SchemaComposer<any>,
): ComposeOutputType;

export function embeddedToGraphQL(
  field: MongooseFieldT,
  prefix: string | undefined,
  schemaComposer: SchemaComposer<any>,
): TypeComposer<any>;

export function enumToGraphQL(
  field: MongooseFieldT,
  prefix: string | undefined,
  schemaComposer: SchemaComposer<any>,
): EnumTypeComposer;

export function documentArrayToGraphQL(
  field: MongooseFieldT,
  prefix: string | undefined,
  schemaComposer: SchemaComposer<any>,
): [TypeComposer<any>];

export function referenceToGraphQL(field: MongooseFieldT): ComposeScalarType;
