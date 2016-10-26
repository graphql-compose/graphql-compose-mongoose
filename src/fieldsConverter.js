/* @flow */
/* eslint-disable no-use-before-define */

import mongoose from 'mongoose';
import objectPath from 'object-path';
import {
  TypeComposer,
  GraphQLDate,
  GraphQLBuffer,
  GraphQLGeneric,
  GraphQLJSON,
} from 'graphql-compose';

import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLEnumType,
  GraphQLObjectType,
} from 'graphql';
import GraphQLMongoID from './types/mongoid';
import typeStorage from './typeStorage';

import type {
  MongooseModelT,
  MongooseModelSchemaT,
  MongoosePseudoModelT,
  MongooseFieldT,
  MongooseFieldMapT,
  ComplexTypesT,
  GraphQLOutputType,
} from './definition';

export const ComplexTypes = {
  ARRAY: 'ARRAY',
  EMBEDDED: 'EMBEDDED',
  DOCUMENT_ARRAY: 'DOCUMENT_ARRAY',
  ENUM: 'ENUM',
  REFERENCE: 'REFERENCE',
  SCALAR: 'SCALAR',
  MIXED: 'MIXED',
};

function _getFieldName(field: MongooseFieldT): string {
  return field.path;
}

function _getFieldType(field: MongooseFieldT): string {
  return field.instance;
}

function _getFieldDescription(field: MongooseFieldT): ?string {
  if (field.options && field.options.description) {
    return field.options.description;
  }

  return undefined;
}

function _getFieldEnums(field: MongooseFieldT): ?string[] {
  if (field.enumValues && field.enumValues.length > 0) {
    return field.enumValues;
  }

  return undefined;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
    } else {
      // create pseudo sub-model
      const name = fieldName.substr(0, dotIdx);
      if (!result[name]) {
        const embeddedField: MongooseFieldT = {
          instance: 'Embedded',
          path: name,
          schema: {
            paths: {},
          },
        };
        result[name] = embeddedField;
      }
      const subName = fieldName.substr(dotIdx + 1);
      result[name].schema.paths[subName] = Object.assign({}, fields[fieldName], { path: subName });
    }
  });

  return result;
}

export function getFieldsFromModel(
  model: MongooseModelT | MongoosePseudoModelT
): MongooseFieldMapT {
  if (!model || !model.schema || !model.schema.paths) {
    throw new Error('You provide incorrect mongoose model to `getFieldsFromModel()`. '
    + 'Correct model should contain `schema.paths` properties.');
  }

  const fields = {};
  const paths = dotPathsToEmbedded(model.schema.paths);

  Object
    .keys(paths)
    .filter(path => !path.startsWith('__')) // skip hidden fields
    .forEach((path) => {
      fields[path] = paths[path];
    });

  return fields;
}

export function convertModelToGraphQL(
  model: MongooseModelT | MongoosePseudoModelT,
  typeName: string
): TypeComposer {
  if (!typeName) {
    throw new Error('You provide empty name for type. '
    + '`name` argument should be non-empty string.');
  }

  const typeComposer = new TypeComposer(
    typeStorage.getOrSet(
      typeName,
      new GraphQLObjectType({
        name: typeName,
        interfaces: [],
        description: undefined,
        fields: {},
      })
    )
  );

  const mongooseFields = getFieldsFromModel(model, typeName);
  const graphqlFields = {};

  Object.keys(mongooseFields).forEach((fieldName) => {
    const mongooseField:MongooseFieldT = mongooseFields[fieldName];
    graphqlFields[fieldName] = {
      type: convertFieldToGraphQL(mongooseField, typeName),
      description: _getFieldDescription(mongooseField),
    };
  });

  typeComposer.addFields(graphqlFields);
  return typeComposer;
}

export function convertSchemaToGraphQL(
  schema: MongooseModelSchemaT,
  typeName: string
) {
  if (!typeName) {
    throw new Error('You provide empty name for type. '
    + '`name` argument should be non-empty string.');
  }

  if (schema._gqcTypeComposer) {
    return schema._gqcTypeComposer;
  }

  const tc = convertModelToGraphQL({ schema }, typeName);
  // also generate InputType
  tc.getInputTypeComposer();

  schema._gqcTypeComposer = tc; // eslint-disable-line
  return tc;
}

export function convertFieldToGraphQL(
  field: MongooseFieldT,
  prefix: string = ''
): GraphQLOutputType {
  const complexType = deriveComplexType(field);
  switch (complexType) {
    case ComplexTypes.SCALAR: return scalarToGraphQL(field);
    case ComplexTypes.ARRAY: return arrayToGraphQL(field, prefix);
    case ComplexTypes.EMBEDDED: return embeddedToGraphQL(field, prefix);
    case ComplexTypes.ENUM: return enumToGraphQL(field, prefix);
    case ComplexTypes.REFERENCE: return referenceToGraphQL(field, prefix);
    case ComplexTypes.DOCUMENT_ARRAY: return documentArrayToGraphQL(field, prefix);
    case ComplexTypes.MIXED: return mixedToGraphQL(field);
    default: return scalarToGraphQL(field);
  }
}

export function deriveComplexType(field: MongooseFieldT): ComplexTypesT {
  if (!field || !field.path || !field.instance) {
    throw new Error('You provide incorrect mongoose field to `deriveComplexType()`. '
    + 'Correct field should contain `path` and `instance` properties.');
  }

  const fieldType = _getFieldType(field);

  if (field instanceof mongoose.Schema.Types.DocumentArray) {
    return ComplexTypes.DOCUMENT_ARRAY;
  } else if (field instanceof mongoose.Schema.Types.Embedded
    || fieldType === 'Embedded'
    ) {
    return ComplexTypes.EMBEDDED;
  } else if (field instanceof mongoose.Schema.Types.Array
    || objectPath.has(field, 'caster.instance')) {
    return ComplexTypes.ARRAY;
  } else if (field instanceof mongoose.Schema.Types.Mixed) {
    return ComplexTypes.MIXED;
  } else if (fieldType === 'ObjectID') {
    return ComplexTypes.REFERENCE;
  }

  const enums = _getFieldEnums(field);
  if (enums) {
    return ComplexTypes.ENUM;
  }

  return ComplexTypes.SCALAR;
}

function removePseudoIdField(typeComposer: TypeComposer): void {
  // remove pseudo object id mongoose field
  const gqFields = typeComposer.getFields();
  const pseudoFieldNames = ['_id'];
  pseudoFieldNames.forEach((name) => {
    if (gqFields[name] && gqFields[name].type === GraphQLMongoID) {
      typeComposer.removeField(name);
    }
  });
}

export function scalarToGraphQL(field: MongooseFieldT): GraphQLOutputType {
  const typeName = _getFieldType(field);

  switch (typeName) {
    case 'String': return GraphQLString;
    case 'Number': return GraphQLFloat;
    case 'Date': return GraphQLDate;
    case 'Buffer': return GraphQLBuffer;
    case 'Boolean': return GraphQLBoolean;
    case 'ObjectID': return GraphQLMongoID;
    default: return GraphQLGeneric;
  }
}

export function arrayToGraphQL(field: MongooseFieldT, prefix: string = ''): GraphQLOutputType {
  if (!field || !field.caster) {
    throw new Error('You provide incorrect mongoose field to `arrayToGraphQL()`. '
    + 'Correct field should contain `caster` property.');
  }

  const unwrappedField = Object.assign({}, field.caster);
  objectPath.set(
    unwrappedField,
    'options.ref',
    objectPath.get(field, 'options.ref', undefined)
  );

  const outputType = convertFieldToGraphQL(unwrappedField, prefix);
  return new GraphQLList(outputType);
}

export function embeddedToGraphQL(
  field: MongooseFieldT,
  prefix: string = ''
): GraphQLOutputType {
  const fieldName = _getFieldName(field);
  const fieldType = _getFieldType(field);

  if (fieldType !== 'Embedded') {
    throw new Error('You provide incorrect field to `embeddedToGraphQL()`. '
    + 'This field should has `Embedded` type. ');
  }

  const typeName = `${prefix}${capitalize(fieldName)}`;
  const typeComposer = convertSchemaToGraphQL(field.schema, typeName);
  removePseudoIdField(typeComposer);

  return typeComposer.getType();
}


export function enumToGraphQL(
  field: MongooseFieldT,
  prefix: string = ''
): GraphQLOutputType {
  const valueList = _getFieldEnums(field);
  if (!valueList) {
    throw new Error('You provide incorrect mongoose field to `enumToGraphQL()`. '
    + 'Correct field should contain `enumValues` property');
  }

  const graphQLEnumValues = valueList.reduce((result, val) => {
    result[val] = { value: val }; // eslint-disable-line no-param-reassign
    return result;
  }, {});

  const typeName = `Enum${prefix}${capitalize(_getFieldName(field))}`;
  return typeStorage.getOrSet(
    typeName,
    new GraphQLEnumType({
      name: typeName,
      description: _getFieldDescription(field),
      values: graphQLEnumValues,
    })
  );
}


export function documentArrayToGraphQL(
  field: MongooseFieldT,
  prefix: string = ''
): GraphQLOutputType {
  if (!(field instanceof mongoose.Schema.Types.DocumentArray)) {
    throw new Error('You provide incorrect mongoose field to `documentArrayToGraphQL()`. '
    + 'Correct field should be instance of `mongoose.Schema.Types.DocumentArray`');
  }

  const typeName = `${prefix}${capitalize(_getFieldName(field))}`;

  const typeComposer = convertModelToGraphQL(field, typeName);
  removePseudoIdField(typeComposer);

  return new GraphQLList(typeComposer.getType());
}


export function referenceToGraphQL(
  field: MongooseFieldT,
  prefix: string = ''
): GraphQLOutputType {
  const fieldType = _getFieldType(field);
  if (fieldType !== 'ObjectID') {
    throw new Error('You provide incorrect mongoose field to `referenceToGraphQL()`. '
    + 'Correct field should has mongoose-type `ObjectID`');
  }

  // const refModelName = objectPath.get(field, 'options.ref');
  // if (refModelName) {
  //   return GQLReference;
  //   // throw new Error('Mongoose REFERENCE to graphQL TYPE not implemented yet. '
  //   //                + `Field ${_getFieldName(field)}`);
  //   // Storage.UnresolvedRefs.setSubKey(parentTypeName, fieldName, { refModelName });
  //   // return GraphQLReference;
  // }

  // this is mongo id field
  return scalarToGraphQL(field, prefix);
}

export function mixedToGraphQL(
  field: MongooseFieldT
): GraphQLOutputType {
  if (!(field instanceof mongoose.Schema.Types.Mixed)) {
    throw new Error('You provide incorrect mongoose field to `mixedToGraphQL()`. '
    + 'Correct field should be instance of `mongoose.Schema.Types.Mixed`');
  }

  return GraphQLJSON;
}
