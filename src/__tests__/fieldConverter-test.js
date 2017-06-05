/* eslint-disable no-unused-expressions, no-template-curly-in-string */

import { GraphQLString, GraphQLFloat, GraphQLBoolean, GraphQLList, GraphQLEnumType, GraphQLSchema, GraphQLObjectType, graphql } from 'graphql';
import {
  GraphQLDate,
  GraphQLBuffer,
  GraphQLGeneric,
  GraphQLJSON,
} from 'graphql-compose';
import { UserModel } from '../__mocks__/userModel';
import {
  deriveComplexType,
  getFieldsFromModel,
  convertFieldToGraphQL,
  ComplexTypes,
  scalarToGraphQL,
  arrayToGraphQL,
  embeddedToGraphQL,
  enumToGraphQL,
  documentArrayToGraphQL,
  mixedToGraphQL,
  referenceToGraphQL,
} from '../fieldsConverter';
import { composeWithMongoose } from '../composeWithMongoose';
import GraphQLMongoID from '../types/mongoid';

describe('fieldConverter', () => {
  const fields = getFieldsFromModel(UserModel);
  const fieldNames = Object.keys(fields);

  describe('getFieldsFromModel()', () => {
    it('should get fieldsMap from mongoose model', () => {
      expect(Object.keys(fields)).toEqual(expect.arrayContaining(['name', 'createdAt', '_id']));
    });

    it('should skip double undescored fields', () => {
      const hiddenFields = fieldNames.filter(name => name.startsWith('__'));
      expect(hiddenFields).toHaveLength(0);
    });

    it('should throw Exception, if model does `schema.path` property', () => {
      expect(() => { getFieldsFromModel({ a: 1 }); }).toThrowError(/incorrect mongoose model/);
      expect(() => { getFieldsFromModel({ schema: {} }); }).toThrowError(/incorrect mongoose model/);
    });
  });

  describe('deriveComplexType()', () => {
    it('should throw error on incorrect mongoose field', () => {
      const err = /incorrect mongoose field/;
      expect(() => { deriveComplexType(); }).toThrowError(err);
      expect(() => { deriveComplexType(123); }).toThrowError(err);
      expect(() => { deriveComplexType({ a: 1 }); }).toThrowError(err);
      expect(() => { deriveComplexType({ path: 'name' }); }).toThrowError(err);
      expect(() => { deriveComplexType({ path: 'name', instance: 'Abc' }); }).not.toThrowError(err);
    });

    it('should derive DOCUMENT_ARRAY', () => {
      expect(deriveComplexType(fields.languages)).toBe(ComplexTypes.DOCUMENT_ARRAY);
    });

    it('should derive EMBEDDED', () => {
      expect(deriveComplexType(fields.contacts)).toBe(ComplexTypes.EMBEDDED);
      expect(deriveComplexType(fields.subDoc)).toBe(ComplexTypes.EMBEDDED);
    });

    it('schould derive ARRAY', () => {
      expect(deriveComplexType(fields.users)).toBe(ComplexTypes.ARRAY);
      expect(deriveComplexType(fields.skills)).toBe(ComplexTypes.ARRAY);
      expect(deriveComplexType(fields.employment)).toBe(ComplexTypes.ARRAY);
    });

    it('schould derive ENUM', () => {
      expect(deriveComplexType(fields.gender)).toBe(ComplexTypes.ENUM);
      expect(deriveComplexType(fields.languages.schema.paths.ln)).toBe(ComplexTypes.ENUM);
      expect(deriveComplexType(fields.languages.schema.paths.sk)).toBe(ComplexTypes.ENUM);
    });

    it('schould derive REFERENCE', () => {
      expect(deriveComplexType(fields.user)).toBe(ComplexTypes.REFERENCE);
    });

    it('schould derive SCALAR', () => {
      expect(deriveComplexType(fields.name)).toBe(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.relocation)).toBe(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.age)).toBe(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.createdAt)).toBe(ComplexTypes.SCALAR);

      expect(deriveComplexType(fields.gender)).not.toBe(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.subDoc)).not.toBe(ComplexTypes.SCALAR);
    });

    it('schould derive MIXED mongoose type', () => {
      expect(deriveComplexType(fields.someDynamic)).toBe(ComplexTypes.MIXED);
    });
  });

  describe('convertFieldToGraphQL()', () => {
    it('should convert any mongoose field to graphQL type', () => {
      const mongooseField = {
        path: 'strFieldName',
        instance: 'String',
      };
      expect(convertFieldToGraphQL(mongooseField)).toBe(GraphQLString);
    });
  });

  describe('scalarToGraphQL()', () => {
    it('should properly convert mongoose scalar type to default graphQL types', () => {
      expect(scalarToGraphQL({ instance: 'String' })).toBe(GraphQLString);
      expect(scalarToGraphQL({ instance: 'Number' })).toBe(GraphQLFloat);
      expect(scalarToGraphQL({ instance: 'Boolean' })).toBe(GraphQLBoolean);
      expect(scalarToGraphQL({ instance: 'ObjectID' })).toBe(GraphQLMongoID);
    });

    it('should properly convert mongoose scalar type to scalar graphql-compose types', () => {
      expect(scalarToGraphQL({ instance: 'Date' })).toBe(GraphQLDate);
      expect(scalarToGraphQL({ instance: 'Buffer' })).toBe(GraphQLBuffer);
      expect(scalarToGraphQL({ instance: 'abrakadabra' })).toBe(GraphQLGeneric);
    });
  });

  describe('arrayToGraphQL()', () => {
    it('should produce GraphQLList', () => {
      const skillsType = arrayToGraphQL(fields.skills);
      expect(skillsType).toBeInstanceOf(GraphQLList);
    });

    it('should has string in ofType', () => {
      const skillsType = arrayToGraphQL(fields.skills);
      expect(skillsType.ofType.name).toBe('String');
    });
  });

  describe('enumToGraphQL()', () => {
    it('should be instance of GraphQLEnumType', () => {
      const genderEnum = enumToGraphQL(fields.gender);
      expect(genderEnum).toBeInstanceOf(GraphQLEnumType);
    });

    it('should have type name `Enum${FieldName}`', () => {
      const genderEnum = enumToGraphQL(fields.gender);
      expect(genderEnum.name).toBe('EnumGender');
    });

    it('should pass all enum values to GQ type', () => {
      const genderEnum = enumToGraphQL(fields.gender);
      expect(genderEnum._values.length).toBe(fields.gender.enumValues.length);
      expect(genderEnum._values[0].value).toBe(fields.gender.enumValues[0]);
    });
  });

  describe('embeddedToGraphQL()', () => {
    it('should set name to graphql type', () => {
      const embeddedType = embeddedToGraphQL(fields.contacts);
      expect(embeddedType.name).toBe('UserContacts');
    });

    it('should have embedded fields', () => {
      const embeddedType = embeddedToGraphQL(fields.contacts);
      const embeddedFields = embeddedType._typeConfig.fields();
      expect(embeddedFields.email).toBeTruthy();
      expect(embeddedFields.locationId).toBeTruthy();
      expect(embeddedFields._id).toBeTruthy();
    });

    it('should return null if subdocument is empty', async () => {
      const UserTC = composeWithMongoose(UserModel);
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: UserTC.getResolver('findById').getFieldConfig(),
          },
        }),
      });


      const user = new UserModel({
        name: 'Test empty subDoc',
      });
      await user.save();
      const result = await graphql(schema, `{
        user(_id: "${user._id}") {
          name
          subDoc {
            field1
            field2 {
              field21
            }
          }
        }
      }`);
      expect(result.data.user).toEqual({
        name: 'Test empty subDoc',
        subDoc: null,
      });
    });

    it('should return subdocument if it is non-empty', async () => {
      const UserTC = composeWithMongoose(UserModel);
      // UserTC.get('$findById.subDoc').extendField('field2', {
      //   resolve: (source) => {
      //     console.log('$findById.subDoc.field2 source:', source)
      //     return source.field2;
      //   }
      // })
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: UserTC.getResolver('findById').getFieldConfig(),
          },
        }),
      });

      const user2 = new UserModel({
        name: 'Test non empty subDoc',
        subDoc: { field2: { field21: 'ok' } },
      });
      await user2.save();
      const result2 = await graphql(schema, `{
        user(_id: "${user2._id}") {
          name
          subDoc {
            field1
            field2 {
              field21
            }
          }
        }
      }`);
      expect(result2.data.user).toEqual({
        name: 'Test non empty subDoc',
        subDoc: {
          field1: null,
          field2: { field21: 'ok' },
        },
      });
    });
  });

  describe('documentArrayToGraphQL()', () => {
    const languagesType = documentArrayToGraphQL(fields.languages);
    const languagesFields = languagesType.ofType._typeConfig.fields();

    it('should produce GraphQLList', () => {
      expect(languagesType).toBeInstanceOf(GraphQLList);
    });

    it('should has Language type in ofType', () => {
      // see src/__mocks__/languageSchema.js where type name `Language` is defined
      expect(languagesType.ofType.name).toBe('Language');
    });

    it('should include pseudo mongoose _id field in document', () => {
      expect(languagesFields._id).toBeTruthy();
    });
  });

  describe('mixedToGraphQL()', () => {
    let user;
    const UserTC = composeWithMongoose(UserModel);

    beforeEach(async () => {
      user = new UserModel({
        name: 'nodkz',
        someDynamic: {
          a: 123,
          b: [1, 2, true, false, 'ok'],
          c: { c: 1 },
          d: null,
          e: 'str',
          f: true,
          g: false,
        },
      });
      await user.save();
    });

    it('should produce GraphQLJSON', () => {
      const someDynamicType = mixedToGraphQL(fields.someDynamic);
      expect(someDynamicType).toBe(GraphQLJSON);
    });

    it('should properly return data via graphql query', async () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: UserTC.getResolver('findById').getFieldConfig(),
          },
        }),
      });

      const query = `{
        user(_id: "${user._id}") {
          name
          someDynamic
        }
      }`;
      const result = await graphql(schema, query);
      expect(result.data.user.name).toBe(user.name);
      expect(result.data.user.someDynamic).toEqual(user.someDynamic);
    });
  });

  describe('referenceToGraphQL()', () => {
    it('should return type of field', () => {
      expect(referenceToGraphQL(fields.user)).toBe(GraphQLMongoID);
    });
  });
});
