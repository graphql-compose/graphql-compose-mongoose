jest.disableAutomock();

import UserModel from '../__mocks__/userModel.js';
import {
  deriveComplexType,
  getFieldsFromModel,
  ComplexTypes,
  scalarToGraphQL,
} from '../fieldsConverter';

import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
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

  });

  describe('enumToGraphQL()', () => {

  });

  describe('referenceToGraphQL()', () => {

  });

  describe('embeddedToGraphQL()', () => {

  });

  describe('documentArrayToGraphQL()', () => {

  });

  // fieldNames.forEach((name) => {
  //   console.log(
  //     fields[name].getClassName(),
  //     name,
  //     fields[name].enumValues,
  //     fields[name] instanceof mongoose.Schema.Types.Embedded,
  //   );
  // });
  //
  // console.log(fields.employment.caster);
  // console.log(fields.languages.caster);
});
