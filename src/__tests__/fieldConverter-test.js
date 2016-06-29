/* eslint-disable no-unused-expressions */

import { expect } from 'chai';
import { UserModel } from '../__mocks__/userModel.js';
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
} from '../fieldsConverter';

import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLEnumType,
} from 'graphql/type';
import GraphQLMongoID from '../types/mongoid';

import {
  GraphQLDate,
  GraphQLBuffer,
  GraphQLGeneric,
} from '../../../graphql-compose/src/type';

/*
Object.prototype.getClassName = function getClassName() {
  const funcNameRegex = /function (.{1,})\(/;
  const results = (funcNameRegex).exec((this).constructor.toString());
  return (results && results.length > 1) ? results[1] : '';
};
*/

describe('fieldConverter', () => {
  const fields = getFieldsFromModel(UserModel);
  const fieldNames = Object.keys(fields);

  describe('getFieldsFromModel()', () => {
    it('should get fieldsMap from mongoose model', () => {
      expect(fields).to.contain.all.keys(['name', 'createdAt', '_id']);
    });

    it('should skip double undescored fields', () => {
      const hiddenFields = fieldNames.filter(name => name.startsWith('__'));
      expect(hiddenFields).to.have.lengthOf(0);
    });

    it('should throw Exception, if model does `schema.path` property', () => {
      expect(() => { getFieldsFromModel({ a: 1 }); }).to.throw(/incorrect mongoose model/);
      expect(() => { getFieldsFromModel({ schema: {} }); }).to.throw(/incorrect mongoose model/);
    });
  });

  describe('deriveComplexType()', () => {
    it('should throw error on incorrect mongoose field', () => {
      const err = /incorrect mongoose field/;
      expect(() => { deriveComplexType(); }).to.throw(err);
      expect(() => { deriveComplexType(123); }).to.throw(err);
      expect(() => { deriveComplexType({ a: 1 }); }).to.throw(err);
      expect(() => { deriveComplexType({ path: 'name' }); }).to.throw(err);
      expect(() => { deriveComplexType({ path: 'name', instance: 'Abc' }); }).not.to.throw(err);
    });

    it('should derive DOCUMENT_ARRAY', () => {
      expect(deriveComplexType(fields.languages)).to.be.equal(ComplexTypes.DOCUMENT_ARRAY);
    });

    it('should derive EMBEDDED', () => {
      expect(deriveComplexType(fields.contacts)).to.equal(ComplexTypes.EMBEDDED);
      expect(deriveComplexType(fields.subDoc)).to.equal(ComplexTypes.EMBEDDED);
    });

    it('schould derive ARRAY', () => {
      expect(deriveComplexType(fields.users)).to.equal(ComplexTypes.ARRAY);
      expect(deriveComplexType(fields.skills)).to.equal(ComplexTypes.ARRAY);
      expect(deriveComplexType(fields.employment)).to.equal(ComplexTypes.ARRAY);
    });

    it('schould derive ENUM', () => {
      expect(deriveComplexType(fields.gender)).to.equal(ComplexTypes.ENUM);
    });

    it('schould derive REFERENCE', () => {
      expect(deriveComplexType(fields.user)).to.equal(ComplexTypes.REFERENCE);
    });

    it('schould derive SCALAR', () => {
      expect(deriveComplexType(fields.name)).to.equal(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.relocation)).to.equal(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.age)).to.equal(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.createdAt)).to.equal(ComplexTypes.SCALAR);

      expect(deriveComplexType(fields.gender)).not.to.equal(ComplexTypes.SCALAR);
      expect(deriveComplexType(fields.subDoc)).not.to.equal(ComplexTypes.SCALAR);
    });
  });

  describe('convertFieldToGraphQL()', () => {
    it('should convert any mongoose field to graphQL type', () => {
      const mongooseField = {
        path: 'strFieldName',
        instance: 'String',
      };
      expect(convertFieldToGraphQL(mongooseField)).to.equal(GraphQLString);
    });
  });

  describe('scalarToGraphQL()', () => {
    it('should properly convert mongoose scalar type to default graphQL types', () => {
      expect(scalarToGraphQL({ instance: 'String' })).to.equal(GraphQLString);
      expect(scalarToGraphQL({ instance: 'Number' })).to.equal(GraphQLFloat);
      expect(scalarToGraphQL({ instance: 'Boolean' })).to.equal(GraphQLBoolean);
      expect(scalarToGraphQL({ instance: 'ObjectID' })).to.equal(GraphQLMongoID);
    });

    it('should properly convert mongoose scalar type to scalar graphql-compose types', () => {
      expect(scalarToGraphQL({ instance: 'Date' })).to.equal(GraphQLDate);
      expect(scalarToGraphQL({ instance: 'Buffer' })).to.equal(GraphQLBuffer);
      expect(scalarToGraphQL({ instance: 'abrakadabra' })).to.equal(GraphQLGeneric);
    });
  });

  describe('arrayToGraphQL()', () => {
    const skillsType = arrayToGraphQL(fields.skills);

    it('should produce GraphQLList', () => {
      expect(skillsType).to.be.instanceof(GraphQLList);
    });

    it('should has string in ofType', () => {
      expect(skillsType.ofType.name).to.equal('String');
    });
  });

  describe('enumToGraphQL()', () => {
    const genderEnum = enumToGraphQL(fields.gender);

    it('should be instance of GraphQLEnumType', () => {
      expect(genderEnum).be.instanceof(GraphQLEnumType);
    });

    it('should have type name `Enum${FieldName}`', () => {
      expect(genderEnum.name).to.equal('EnumGender');
    });

    it('should pass all enum values to GQ type', () => {
      expect(genderEnum._values.length).to.equal(fields.gender.enumValues.length);
      expect(genderEnum._values[0].value).to.equal(fields.gender.enumValues[0]);
    });
  });

  describe('embeddedToGraphQL()', () => {
    const embeddedType = embeddedToGraphQL(fields.contacts);
    const embeddedFields = embeddedType._typeConfig.fields();

    it('should set name to graphql type', () => {
      expect(embeddedType.name).to.equal('Contacts');
    });

    it('should have embedded fields', () => {
      expect(embeddedFields.email).to.be.defined;
    });

    it('should skip pseudo mongoose _id field', () => {
      expect(embeddedFields._id).to.be.undefined;
    });
  });

  describe('documentArrayToGraphQL()', () => {
    const languagesType = documentArrayToGraphQL(fields.languages);
    const languagesFields = languagesType.ofType._typeConfig.fields();

    it('should produce GraphQLList', () => {
      expect(languagesType).to.be.instanceof(GraphQLList);
    });

    it('should has Languages type in ofType', () => {
      expect(languagesType.ofType.name).to.equal('Languages');
    });

    it('should skip pseudo mongoose _id field in document', () => {
      expect(languagesFields._id).to.be.undefined;
    });
  });

  describe('referenceToGraphQL()', () => {
    xit('', () => {

    });
  });
});
