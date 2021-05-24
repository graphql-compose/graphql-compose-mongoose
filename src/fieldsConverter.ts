/* eslint-disable no-use-before-define */

import mongoose, { Document } from 'mongoose';
import type { Schema, Model } from 'mongoose';
import {
  SchemaComposer,
  ObjectTypeComposer,
  EnumTypeComposer,
  ComposeOutputTypeDefinition,
  ObjectTypeComposerFieldConfigAsObjectDefinition,
} from 'graphql-compose';
import { upperFirst } from 'graphql-compose';
import type { GraphQLScalarType } from 'graphql-compose/lib/graphql';
import GraphQLMongoID from './types/MongoID';
import GraphQLBSONDecimal from './types/BSONDecimal';
import {
  convertModelToGraphQLWithDiscriminators,
  EDiscriminatorTypeComposer,
} from './enhancedDiscriminators';
import { ComposeMongooseOpts } from './composeMongoose';

type MongooseFieldT = {
  path?: string;
  instance: string;
  caster?: any;
  options?: {
    description?: string;
    alias?: string;
  };
  originalRequiredValue?: string | (() => any);
  isRequired?: boolean;
  defaultValue?: any;
  enumValues?: string[];
  schema?: Schema;
  _index?: { [optionName: string]: any };
};
type MongooseFieldMapT = { [fieldName: string]: MongooseFieldT };
type ComposeScalarType = string | GraphQLScalarType;

export type MongoosePseudoModelT = {
  schema: Schema<any>;
};

export enum ComplexTypes {
  ARRAY = 'ARRAY',
  EMBEDDED = 'EMBEDDED',
  DOCUMENT_ARRAY = 'DOCUMENT_ARRAY',
  ENUM = 'ENUM',
  REFERENCE = 'REFERENCE',
  SCALAR = 'SCALAR',
  MIXED = 'MIXED',
  DECIMAL = 'DECIMAL',
}

function _getFieldName(field: MongooseFieldT): string {
  return field.path || '__unknownField__';
}

function _getFieldType(field: MongooseFieldT): string {
  return field.instance;
}

function _getFieldDescription(field: MongooseFieldT): string | undefined {
  if (field.options && field.options.description) {
    return field.options.description;
  }

  return undefined;
}

function _getFieldEnums(field: MongooseFieldT): string[] | undefined {
  if (field.enumValues && field.enumValues.length > 0) {
    return field.enumValues;
  }

  return undefined;
}

export function dotPathsToEmbedded(fields: MongooseFieldMapT): MongooseFieldMapT {
  // convert only one dot-level on this step to EmbeddedModel
  // further when converting EmbeddedModel to GQL, it internally
  // call this method to extract deep fields with dots

  const result: MongooseFieldMapT = {};

  Object.keys(fields).forEach((fieldName) => {
    const dotIdx = fieldName.indexOf('.');
    if (dotIdx === -1) {
      result[fieldName] = fields[fieldName];
    } else if (fieldName.substr(dotIdx, 3) === '.$*') {
      // skip { type: Map of: String }
      // do not add this field to result
    } else {
      // create pseudo sub-model
      const name = fieldName.substr(0, dotIdx);
      if (!result[name]) {
        const embeddedField = {
          instance: 'Embedded',
          path: name,
          schema: {
            paths: {},
          },
        } as MongooseFieldT;
        result[name] = embeddedField;
      }
      const subName = fieldName.substr(dotIdx + 1);

      const fieldSchema = result[name].schema;
      if (!fieldSchema) {
        throw new Error(`Field ${name} does not have schema property`);
      }
      fieldSchema.paths[subName] = { ...fields[fieldName], path: subName } as any;
    }
  });

  return result;
}

export function getFieldsFromModel(model: Model<any> | MongoosePseudoModelT): MongooseFieldMapT {
  if (!model || !model.schema || !model.schema.paths) {
    throw new Error(
      'You provide incorrect mongoose model to `getFieldsFromModel()`. ' +
        'Correct model should contain `schema.paths` properties.'
    );
  }

  const fields: Record<string, MongooseFieldT> = {};
  const paths = dotPathsToEmbedded((model as any).schema.paths);

  Object.keys(paths)
    .filter((path) => !path.startsWith('__')) // skip hidden fields
    .forEach((path: string) => {
      fields[path] = paths[path];
    });

  return fields;
}

export function convertModelToGraphQL<TDoc extends Document, TContext>(
  model: Model<TDoc> | MongoosePseudoModelT,
  typeName: string,
  schemaComposer: SchemaComposer<TContext>,
  opts: ComposeMongooseOpts<TContext> = {}
): ObjectTypeComposer<TDoc, TContext> {
  const sc = schemaComposer;

  if (!typeName) {
    throw new Error('You provide empty name for type. `name` argument should be non-empty string.');
  }

  // if model already has generated ObjectTypeComposer early, then return it
  if (sc.has(model.schema)) {
    return sc.getOTC(model.schema);
  }

  if (opts.includeBaseDiscriminators) {
    return convertModelToGraphQLWithDiscriminators(model, typeName, sc, opts);
  }

  const typeComposer = sc.getOrCreateOTC(typeName);
  sc.set(model.schema, typeComposer);
  sc.set(typeName, typeComposer);

  const mongooseFields = getFieldsFromModel(model);
  const graphqlFields = {} as Record<
    string,
    ObjectTypeComposerFieldConfigAsObjectDefinition<any, any>
  >;
  const requiredFields = [] as string[];

  Object.keys(mongooseFields).forEach((key) => {
    const mongooseField: MongooseFieldT = mongooseFields[key];

    let fieldName = key;
    if (typeof mongooseField?.options?.alias === 'string') {
      fieldName = mongooseField?.options?.alias;
    }

    if (
      mongooseField.isRequired &&
      // conditional required field in mongoose cannot be NonNullable in GraphQL
      typeof mongooseField?.originalRequiredValue !== 'function'
    ) {
      requiredFields.push(fieldName);
    }

    let type = convertFieldToGraphQL(mongooseField, typeName, sc, opts);

    // in mongoose schema we use javascript `Number` object which casted to `Float` type
    // so in most cases _id field is `Int`
    if (fieldName === '_id' && type === 'Float') {
      type = 'Int';
    }

    let trueType = type;
    if (trueType instanceof Array) {
      trueType = trueType[0];
    }
    if (trueType instanceof EDiscriminatorTypeComposer) {
      type = type instanceof Array ? [trueType.getDInterface()] : trueType.getDInterface();
    }

    graphqlFields[fieldName] = {
      type,
      description: _getFieldDescription(mongooseField),
    };

    if (mongooseField?.defaultValue !== null && mongooseField?.defaultValue !== undefined) {
      if (!graphqlFields[fieldName].extensions) graphqlFields[fieldName].extensions = {};
      (graphqlFields as any)[fieldName].extensions.defaultValue = mongooseField?.defaultValue;
    }
  });

  typeComposer.addFields(graphqlFields);
  typeComposer.makeFieldNonNull(requiredFields);
  return typeComposer;
}

export function convertSchemaToGraphQL(
  schema: Schema<any>,
  typeName: string,
  schemaComposer: SchemaComposer<any>,
  opts: ComposeMongooseOpts<any> = {}
): ObjectTypeComposer<any, any> {
  const sc = schemaComposer;

  if (!typeName) {
    throw new Error('You provide empty name for type. `name` argument should be non-empty string.');
  }

  if (sc.has(schema)) {
    return sc.getOTC(schema);
  }

  const tc = convertModelToGraphQL({ schema }, typeName, sc, opts);
  // also generate InputType
  tc.getInputTypeComposer();

  sc.set(schema, tc);
  return tc;
}

export function convertFieldToGraphQL(
  field: MongooseFieldT,
  prefix: string = '',
  schemaComposer: SchemaComposer<any>,
  opts: ComposeMongooseOpts<any> = {}
): ComposeOutputTypeDefinition<any> {
  if (!schemaComposer.has('MongoID')) {
    schemaComposer.add(GraphQLMongoID);
  }

  const complexType = deriveComplexType(field);
  switch (complexType) {
    case ComplexTypes.SCALAR:
      return scalarToGraphQL(field);
    case ComplexTypes.ARRAY:
      return arrayToGraphQL(field, prefix, schemaComposer, opts);
    case ComplexTypes.EMBEDDED:
      return embeddedToGraphQL(field, prefix, schemaComposer, opts);
    case ComplexTypes.ENUM:
      return enumToGraphQL(field, prefix, schemaComposer);
    case ComplexTypes.REFERENCE:
      return referenceToGraphQL(field);
    case ComplexTypes.DOCUMENT_ARRAY:
      return documentArrayToGraphQL(field, prefix, schemaComposer, opts);
    case ComplexTypes.MIXED:
      return 'JSON';
    case ComplexTypes.DECIMAL:
      if (!schemaComposer.has('BSONDecimal')) {
        schemaComposer.add(GraphQLBSONDecimal);
      }
      return 'BSONDecimal';
    default:
      return scalarToGraphQL(field);
  }
}

export function deriveComplexType(field: MongooseFieldT): ComplexTypes {
  if (!field || !field.path || !field.instance) {
    throw new Error(
      'You provide incorrect mongoose field to `deriveComplexType()`. ' +
        'Correct field should contain `path` and `instance` properties.'
    );
  }

  const fieldType = _getFieldType(field);
  if (
    field instanceof mongoose.Schema.Types.DocumentArray ||
    (fieldType === 'Array' && field?.schema?.paths)
  ) {
    return ComplexTypes.DOCUMENT_ARRAY;
  } else if (field instanceof mongoose.Schema.Types.Embedded || fieldType === 'Embedded') {
    return ComplexTypes.EMBEDDED;
  } else if (field instanceof mongoose.Schema.Types.Array || field?.caster?.instance) {
    return ComplexTypes.ARRAY;
  } else if (field instanceof mongoose.Schema.Types.Mixed) {
    return ComplexTypes.MIXED;
  } else if (fieldType === 'ObjectID') {
    return ComplexTypes.REFERENCE;
  } else if (fieldType === 'Decimal128') {
    return ComplexTypes.DECIMAL;
  }

  const enums = _getFieldEnums(field);
  if (enums) {
    return ComplexTypes.ENUM;
  }

  return ComplexTypes.SCALAR;
}

export function scalarToGraphQL(field: MongooseFieldT): ComposeScalarType {
  const typeName = _getFieldType(field);

  switch (typeName) {
    case 'String':
      return 'String';
    case 'Number':
      return 'Float';
    case 'Date':
      return 'Date';
    case 'Buffer':
      return 'Buffer';
    case 'Boolean':
      return 'Boolean';
    case 'ObjectID':
      return 'MongoID';
    default:
      return 'JSON';
  }
}

export function arrayToGraphQL(
  field: MongooseFieldT,
  prefix: string = '',
  schemaComposer: SchemaComposer<any>,
  opts: ComposeMongooseOpts<any> = {}
): ComposeOutputTypeDefinition<any> {
  if (!field || !field.caster) {
    throw new Error(
      'You provide incorrect mongoose field to `arrayToGraphQL()`. ' +
        'Correct field should contain `caster` property.'
    );
  }

  const unwrappedField = { ...field.caster };

  opts.includeBaseDiscriminators = opts.includeNestedDiscriminators; // workaround to avoid recursive loop on convertModel and support nested discrim fields

  const outputType: any = convertFieldToGraphQL(unwrappedField, prefix, schemaComposer, opts);
  return [outputType];
}

export function embeddedToGraphQL(
  field: MongooseFieldT,
  prefix: string = '',
  schemaComposer: SchemaComposer<any>,
  opts: ComposeMongooseOpts<any> = {}
): ObjectTypeComposer<any, any> {
  const fieldName = _getFieldName(field);
  const fieldType = _getFieldType(field);

  if (fieldType !== 'Embedded') {
    throw new Error(
      `You provide incorrect field '${prefix}.${fieldName}' to 'embeddedToGraphQL()'. ` +
        'This field should has `Embedded` type. '
    );
  }

  const fieldSchema = field.schema;
  if (!fieldSchema) {
    throw new Error(`Mongoose field '${prefix}.${fieldName}' should have 'schema' property`);
  }

  opts.includeBaseDiscriminators = opts.includeNestedDiscriminators; // workaround to avoid recursive loop on convertModel and support nested discrim fields
  const typeName = `${prefix}${upperFirst(fieldName)}`;
  return convertSchemaToGraphQL(fieldSchema, typeName, schemaComposer, opts);
}

export function enumToGraphQL(
  field: MongooseFieldT,
  prefix: string = '',
  schemaComposer: SchemaComposer<any>
): EnumTypeComposer<any> {
  const valueList = _getFieldEnums(field);
  if (!valueList) {
    throw new Error(
      'You provide incorrect mongoose field to `enumToGraphQL()`. ' +
        'Correct field should contain `enumValues` property'
    );
  }

  const typeName = `Enum${prefix}${upperFirst(_getFieldName(field))}`;

  return schemaComposer.getOrCreateETC(typeName, (etc) => {
    const desc = _getFieldDescription(field);
    if (desc) etc.setDescription(desc);

    const fields = valueList.reduce((result, value) => {
      const key = value.replace(/[^_a-zA-Z0-9]/g, '_');
      result[key] = { value };
      return result;
    }, {} as Record<string, { value: any }>);
    etc.setFields(fields);
  });
}

export function documentArrayToGraphQL(
  field: MongooseFieldT,
  prefix: string = '',
  schemaComposer: SchemaComposer<any>,
  opts: ComposeMongooseOpts<any> = {}
): [ObjectTypeComposer<any, any>] {
  if (!(field instanceof mongoose.Schema.Types.DocumentArray) && !field?.schema?.paths) {
    throw new Error(
      'You provide incorrect mongoose field to `documentArrayToGraphQL()`. ' +
        'Correct field should be instance of `mongoose.Schema.Types.DocumentArray`'
    );
  }

  const typeName = `${prefix}${upperFirst(_getFieldName(field))}`;

  opts.includeBaseDiscriminators = opts.includeNestedDiscriminators; // workaround to avoid recursive loop on convertModel and support nested discrim fields
  const tc = convertModelToGraphQL(field as any, typeName, schemaComposer, opts);

  return [tc];
}

export function referenceToGraphQL(field: MongooseFieldT): ComposeScalarType {
  return scalarToGraphQL(field);
}
