jest.disableAutomock();

import UserModel from '../__mocks__/userModel.js';
import {
  deriveComplexType,
  getFieldsFromModel,
  convertFieldToGraphQL,
  ComplexTypes,
  scalarToGraphQL,
  arrayToGraphQL,
  embeddedToGraphQL,
  enumToGraphQL,
  referenceToGraphQL,
  documentArrayToGraphQL,
} from '../fieldsConverter';

import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLEnumType,
  GraphQLID,
} from 'graphql/type';

import {
  GraphQLDate,
  GraphQLBuffer,
  GraphQLGeneric,
} from '../../../graphql-compose/src/type';

Object.prototype.getClassName = function() {
   var funcNameRegex = /function (.{1,})\(/;
   var results = (funcNameRegex).exec((this).constructor.toString());
   return (results && results.length > 1) ? results[1] : "";
};

describe('fieldConverter', () => {
  const fields = getFieldsFromModel(UserModel);
  const fieldNames = Object.keys(fields);

  describe('getFieldsFromModel()', () => {
    it('should get fieldsMap from mongoose model', () => {
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('createdAt');
      expect(fieldNames).toContain('_id');
    });

    it('should skip double undescored fields', () => {
      const hiddenFields = fieldNames.filter(name => name.startsWith('__'));
      expect(hiddenFields.length).toEqual(0);
    });

    it('should throw Exception, if model does `schema.path` property', () => {
      const err = new Error('You provide incorrect mongoose model to `getFieldsFromModel()`. '
      + 'Correct model should contain `schema.paths` properties.');

      expect(() => { getFieldsFromModel({ a: 1 }); }).toThrow(err);
      expect(() => { getFieldsFromModel({ schema: {} }); }).toThrow(err);
    });
  });

  describe('deriveComplexType()', () => {
    it('should throw error on incorrect mongoose field', () => {
      const err = new Error('You provide incorrect mongoose field to `deriveComplexType()`. '
      + 'Correct field should contain `path` and `instance` properties.');

      expect(() => { deriveComplexType(); }).toThrow(err);
      expect(() => { deriveComplexType(123); }).toThrow(err);
      expect(() => { deriveComplexType({ a: 1 }); }).toThrow(err);
      expect(() => { deriveComplexType({ path: 'name' }); }).toThrow(err);
      expect(() => { deriveComplexType({ path: 'name', instance: 'Abc' }); }).not.toThrow(err);
    });

    it('should derive DOCUMENT_ARRAY', () => {
      expect(deriveComplexType(fields.languages)).toEqual(ComplexTypes.DOCUMENT_ARRAY);
    });

    it('should derive EMBEDDED', () => {
      expect(deriveComplexType(fields.contacts))
        .toEqual(ComplexTypes.EMBEDDED);

      expect(deriveComplexType(fields.subDoc))
        .toEqual(ComplexTypes.EMBEDDED);
    });

    it('schould derive ARRAY', () => {
      expect(deriveComplexType(fields.users)).toEqual(ComplexTypes.ARRAY);
      expect(deriveComplexType(fields.skills)).toEqual(ComplexTypes.ARRAY);
      expect(deriveComplexType(fields.employment)).toEqual(ComplexTypes.ARRAY);
    });

    it('schould derive ENUM', () => {
      expect(deriveComplexType(fields.gender)).toEqual(ComplexTypes.ENUM);
    });

    it('schould derive REFERENCE', () => {
      expect(deriveComplexType(fields.user)).toEqual(ComplexTypes.REFERENCE);
    });

    it('schould derive SCALAR', () => {
      expect(deriveComplexType(fields.name)).toEqual(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.relocation)).toEqual(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.totalExperience)).toEqual(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.createdAt)).toEqual(ComplexTypes.SCALAR);

      expect(deriveComplexType(fields.gender)).not.toEqual(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.subDoc)).not.toEqual(ComplexTypes.SCALAR);
    });
  });

  describe('convertFieldToGraphQL()', () => {
    it('should convert any mongoose field to graphQL type', () => {
      const mongooseField = {
        path: 'strFieldName',
        instance: 'String',
      };
      expect(convertFieldToGraphQL(mongooseField)).toEqual(GraphQLString);
    });
  });

  describe('scalarToGraphQL()', () => {
    it('should properly convert mongoose scalar type to default graphQL types', () => {
      expect(scalarToGraphQL({ instance: 'String' })).toEqual(GraphQLString);
      expect(scalarToGraphQL({ instance: 'Number' })).toEqual(GraphQLFloat);
      expect(scalarToGraphQL({ instance: 'Boolean' })).toEqual(GraphQLBoolean);
      expect(scalarToGraphQL({ instance: 'ObjectID' })).toEqual(GraphQLID);
    });

    it('should properly convert mongoose scalar type to scalar graphql-compose types', () => {
      expect(scalarToGraphQL({ instance: 'Date' })).toEqual(GraphQLDate);
      expect(scalarToGraphQL({ instance: 'Buffer' })).toEqual(GraphQLBuffer);
      expect(scalarToGraphQL({ instance: 'abrakadabra' })).toEqual(GraphQLGeneric);
    });
  });

  describe('arrayToGraphQL()', () => {
    const skillsType = arrayToGraphQL(fields.skills);

    it('should produce GraphQLList', () => {
      expect(skillsType instanceof GraphQLList).toBeTruthy();
    });

    it('should has string in ofType', () => {
      expect(skillsType.ofType.name).toEqual('String');
    });
  });

  describe('enumToGraphQL()', () => {
    const genderEnum = enumToGraphQL(fields.gender);

    it('should be instance of GraphQLEnumType', () => {
      expect(genderEnum instanceof GraphQLEnumType).toBeTruthy();
    });

    it('should have type name `Enum${FieldName}`', () => {
      expect(genderEnum.name).toEqual('EnumGender');
    });

    it('should pass all enum values to GQ type', () => {
      expect(genderEnum._values.length).toEqual(fields.gender.enumValues.length);
      expect(genderEnum._values[0].value).toEqual(fields.gender.enumValues[0]);
    });
  });

  describe('embeddedToGraphQL()', () => {
    const embeddedType = embeddedToGraphQL(fields.contacts);
    const embeddedFields = embeddedType._typeConfig.fields();

    it('should set name to graphql type', () => {
      expect(embeddedType.name).toEqual('Contacts');
    });

    it('should have embedded fields', () => {
      expect(embeddedFields.email).toBeDefined();
    });

    it('should skip pseudo mongoose _id field', () => {
      expect(embeddedFields._id).toBeUndefined();
    });
  });

  describe('documentArrayToGraphQL()', () => {
    const languagesType = documentArrayToGraphQL(fields.languages);
    const languagesFields = languagesType.ofType._typeConfig.fields();

    it('should produce GraphQLList', () => {
      expect(languagesType instanceof GraphQLList).toBeTruthy();
    });

    it('should has Languages type in ofType', () => {
      expect(languagesType.ofType.name).toEqual('Languages');
    });

    it('should skip pseudo mongoose _id field in document', () => {
      expect(languagesFields._id).toBeUndefined();
    });
  });

  describe('referenceToGraphQL()', () => {
    xit('', () => {

    });
  });
});
