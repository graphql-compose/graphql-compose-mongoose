/* @flow */
/* eslint-disable no-unused-expressions, no-template-curly-in-string */

import { EnumTypeComposer, schemaComposer, ListComposer, SchemaComposer } from 'graphql-compose';
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
  referenceToGraphQL,
  convertModelToGraphQL,
} from '../fieldsConverter';
import GraphQLMongoID from '../types/mongoid';
import GraphQLBSONDecimal from '../types/bsonDecimal';

describe('fieldConverter', () => {
  const fields: { [key: string]: any } = getFieldsFromModel(UserModel);
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
      expect(() => {
        const wrongArgs: any = [{ a: 1 }];
        getFieldsFromModel(...wrongArgs);
      }).toThrowError(/incorrect mongoose model/);
      expect(() => {
        const wrongArgs: any = [{ schema: {} }];
        getFieldsFromModel(...wrongArgs);
      }).toThrowError(/incorrect mongoose model/);
    });
  });

  describe('deriveComplexType()', () => {
    it('should throw error on incorrect mongoose field', () => {
      const err = /incorrect mongoose field/;
      expect(() => {
        const wrongArgs: any = [];
        deriveComplexType(...wrongArgs);
      }).toThrowError(err);
      expect(() => {
        const wrongArgs: any = [123];
        deriveComplexType(...wrongArgs);
      }).toThrowError(err);
      expect(() => {
        const wrongArgs: any = [{ a: 1 }];
        deriveComplexType(...wrongArgs);
      }).toThrowError(err);
      expect(() => {
        const wrongArgs: any = [{ path: 'name' }];
        deriveComplexType(...wrongArgs);
      }).toThrowError(err);
      expect(() => {
        deriveComplexType({ path: 'name', instance: 'Abc' });
      }).not.toThrowError(err);
    });

    it('should derive DOCUMENT_ARRAY', () => {
      expect(deriveComplexType(fields.languages)).toBe(ComplexTypes.DOCUMENT_ARRAY);
      expect(deriveComplexType(fields.periods)).toBe(ComplexTypes.DOCUMENT_ARRAY);
    });

    it('should derive EMBEDDED', () => {
      expect(deriveComplexType(fields.contacts)).toBe(ComplexTypes.EMBEDDED);
      expect(deriveComplexType(fields.subDoc)).toBe(ComplexTypes.EMBEDDED);
    });

    it('should derive DECIMAL', () => {
      expect(deriveComplexType(fields.salary)).toBe(ComplexTypes.DECIMAL);
    });

    it('should derive ARRAY', () => {
      expect(deriveComplexType(fields.users)).toBe(ComplexTypes.ARRAY);
      expect(deriveComplexType(fields.skills)).toBe(ComplexTypes.ARRAY);
      expect(deriveComplexType(fields.employment)).toBe(ComplexTypes.ARRAY);
    });

    it('should derive ENUM', () => {
      expect(deriveComplexType(fields.gender)).toBe(ComplexTypes.ENUM);
      expect(deriveComplexType(fields.languages.schema.paths.ln)).toBe(ComplexTypes.ENUM);
      expect(deriveComplexType(fields.languages.schema.paths.sk)).toBe(ComplexTypes.ENUM);
    });

    it('should derive REFERENCE', () => {
      expect(deriveComplexType(fields.user)).toBe(ComplexTypes.REFERENCE);
    });

    it('should derive SCALAR', () => {
      expect(deriveComplexType(fields.name)).toBe(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.relocation)).toBe(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.age)).toBe(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.createdAt)).toBe(ComplexTypes.SCALAR);

      expect(deriveComplexType(fields.gender)).not.toBe(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.subDoc)).not.toBe(ComplexTypes.SCALAR);
    });

    it('should derive MIXED mongoose type', () => {
      expect(deriveComplexType(fields.someDynamic)).toBe(ComplexTypes.MIXED);
    });
  });

  describe('convertFieldToGraphQL()', () => {
    it('should convert any mongoose field to graphQL type', () => {
      const mongooseField = {
        path: 'strFieldName',
        instance: 'String',
      };
      expect(convertFieldToGraphQL(mongooseField, '', schemaComposer)).toBe('String');
    });

    it('should add GraphQLMongoID to schemaComposer', () => {
      schemaComposer.clear();
      expect(schemaComposer.has('MongoID')).toBeFalsy();
      const mongooseField = {
        path: 'strFieldName',
        instance: 'ObjectID',
      };
      expect(convertFieldToGraphQL(mongooseField, '', schemaComposer)).toBe('MongoID');
      expect(schemaComposer.get('MongoID').getType()).toBe(GraphQLMongoID);
    });

    it('should use existed GraphQLMongoID in schemaComposer', () => {
      schemaComposer.clear();
      expect(schemaComposer.has('MongoID')).toBeFalsy();
      const customType = schemaComposer.createScalarTC('MyMongoId');
      schemaComposer.set('MongoID', customType);
      const mongooseField = {
        path: 'strFieldName',
        instance: 'ObjectID',
      };
      expect(convertFieldToGraphQL(mongooseField, '', schemaComposer)).toBe('MongoID');
      expect(schemaComposer.get('MongoID')).toBe(customType);
      schemaComposer.delete('MongoID');
    });

    it('should convert any mongoose field to graphQL type', () => {
      schemaComposer.clear();
      expect(schemaComposer.has('BSONDecimal')).toBeFalsy();
      const mongooseField = {
        path: 'salary',
        instance: 'Decimal128',
      };
      expect(convertFieldToGraphQL(mongooseField, '', schemaComposer)).toBe('BSONDecimal');
      expect(schemaComposer.has('BSONDecimal')).toBeTruthy();
      expect(schemaComposer.get('BSONDecimal').getType()).toBe(GraphQLBSONDecimal);
    });
  });

  describe('scalarToGraphQL()', () => {
    it('should properly convert mongoose scalar type to default graphQL types', () => {
      expect(scalarToGraphQL({ instance: 'String' })).toBe('String');
      expect(scalarToGraphQL({ instance: 'Number' })).toBe('Float');
      expect(scalarToGraphQL({ instance: 'Boolean' })).toBe('Boolean');
      expect(scalarToGraphQL({ instance: 'ObjectID' })).toBe('MongoID');
    });

    it('should properly convert mongoose scalar type to scalar graphql-compose types', () => {
      expect(scalarToGraphQL({ instance: 'Date' })).toBe('Date');
      expect(scalarToGraphQL({ instance: 'Buffer' })).toBe('Buffer');
      expect(scalarToGraphQL({ instance: 'abrakadabra' })).toBe('JSON');
    });
  });

  describe('arrayToGraphQL()', () => {
    it('should produce GraphQLList', () => {
      const skillsType = arrayToGraphQL(fields.skills, '', schemaComposer);
      expect(skillsType).toEqual(['String']);
    });
  });

  describe('enumToGraphQL()', () => {
    it('should be instance of GraphQLEnumType', () => {
      const genderEnum = enumToGraphQL(fields.gender, '', schemaComposer);
      expect(genderEnum).toBeInstanceOf(EnumTypeComposer);
    });

    it('should have type name `Enum${FieldName}`', () => {
      const genderEnum = enumToGraphQL(fields.gender, '', schemaComposer);
      expect(genderEnum.getTypeName()).toBe('EnumGender');
    });

    it('should pass all enum values to GQ type', () => {
      const genderEnum = enumToGraphQL(fields.gender, '', schemaComposer);
      expect(genderEnum.getFieldNames().length).toBe(fields.gender.enumValues.length);
      expect(genderEnum.getField('male').value).toBe(fields.gender.enumValues[0]);
    });
  });

  describe('embeddedToGraphQL()', () => {
    it('should set name to graphql type', () => {
      const embeddedTC = embeddedToGraphQL(fields.contacts, '', schemaComposer);
      expect(embeddedTC.getTypeName()).toBe('Contacts');
    });

    it('should have embedded fields', () => {
      const embeddedTC: any = embeddedToGraphQL(fields.contacts, '', schemaComposer);
      const embeddedFields = embeddedTC.getFields();
      expect(embeddedFields.email).toBeTruthy();
      expect(embeddedFields.locationId).toBeTruthy();
      expect(embeddedFields._id).toBeTruthy();
    });

    it('test object with field as array', () => {
      const someDeepTC = embeddedToGraphQL(fields.someDeep, '', schemaComposer);
      expect(someDeepTC.getTypeName()).toBe('SomeDeep');
      expect(someDeepTC.getField('periods').type).toBeInstanceOf(ListComposer);
      const tc = someDeepTC.getFieldOTC('periods');
      expect(tc.getTypeName()).toBe('SomeDeepPeriods');
      expect(tc.hasField('from')).toBeTruthy();
      expect(tc.hasField('to')).toBeTruthy();
    });
  });

  describe('documentArrayToGraphQL()', () => {
    it('test schema as array', () => {
      const languagesTypeAsList = documentArrayToGraphQL(fields.languages, '', schemaComposer);
      const languagesType = languagesTypeAsList[0];
      const languagesFields = languagesType.getFields();

      expect(Array.isArray(languagesTypeAsList)).toBeTruthy();
      expect(languagesType.getTypeName()).toBe('Languages');
      expect(languagesFields._id).toBeTruthy();
    });

    it('test object as array', () => {
      const periodsTypeAsList = documentArrayToGraphQL(fields.periods, '', schemaComposer);
      const periodsType = periodsTypeAsList[0];
      const periodsFields = periodsType.getFields();
      expect(Array.isArray(periodsTypeAsList)).toBeTruthy();
      expect(periodsType.getTypeName()).toBe('Periods');
      expect(periodsFields.from).toBeTruthy();
      expect(periodsFields.to).toBeTruthy();
    });
  });

  describe('referenceToGraphQL()', () => {
    it('should return type of field', () => {
      expect(referenceToGraphQL(fields.user)).toBe('MongoID');
    });
  });

  describe('convertModelToGraphQL()', () => {
    const sc = new SchemaComposer();
    const tc = convertModelToGraphQL(UserModel, 'User', sc);

    it('should work with String', () => {
      expect(tc.getFieldTypeName('name')).toBe('String');
      expect(tc.getFieldTypeName('skills')).toBe('[String]');
    });

    it('should work with Number', () => {
      expect(tc.getFieldTypeName('age')).toBe('Float');
    });

    it('should work with ObjectId', () => {
      expect(tc.getFieldTypeName('user')).toBe('MongoID');
    });

    it('should work with Enum', () => {
      expect((tc: any).getFieldTC('gender').getFieldNames()).toEqual(['male', 'female', 'ladyboy']);

      expect((tc: any).getFieldTC('employment').getFieldNames()).toEqual([
        'full',
        'partial',
        'remote',
      ]);
    });

    it('should work with Boolean', () => {
      expect(tc.getFieldTypeName('relocation')).toBe('Boolean');
    });

    it('should extract sub schemas', () => {
      const contactsTC = tc.getFieldOTC('contacts');
      expect(contactsTC.getFieldNames()).toEqual(['phones', 'email', 'skype', 'locationId', '_id']);
    });

    it('should skip __secretField', () => {
      expect(tc.hasField('__secretField')).toBeFalsy();
    });

    it('should work with Mixed', () => {
      expect(tc.getFieldTypeName('someDynamic')).toBe('JSON');
    });

    it('should work with Array', () => {
      expect(tc.getFieldTypeName('periods')).toBe('[UserPeriods]');
      expect(sc.getOTC('UserPeriods').getFieldNames()).toEqual(['from', 'to', '_id']);

      expect(tc.getFieldTypeName('someDeep')).toBe('UserSomeDeep');
      expect(tc.getFieldOTC('someDeep').getFieldTypeName('periods')).toBe('[UserSomeDeepPeriods]');
      expect(sc.getOTC('UserSomeDeepPeriods').getFieldNames()).toEqual(['from', 'to', '_id']);
    });

    it('should work with Decimal128', () => {
      expect(tc.getFieldTypeName('salary')).toBe('BSONDecimal');
    });
  });
});
