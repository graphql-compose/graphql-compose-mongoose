/* eslint-disable no-unused-expressions, no-template-curly-in-string */

import { expect } from 'chai';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLEnumType,
  GraphQLSchema,
  GraphQLObjectType,
  graphql,
} from 'graphql';
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
      expect(deriveComplexType(fields.languages.schema.paths.ln)).to.equal(ComplexTypes.ENUM);
      expect(deriveComplexType(fields.languages.schema.paths.sk)).to.equal(ComplexTypes.ENUM);
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

    it('schould derive MIXED mongoose type', () => {
      expect(deriveComplexType(fields.someDynamic)).to.equal(ComplexTypes.MIXED);
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
    it('should produce GraphQLList', () => {
      const skillsType = arrayToGraphQL(fields.skills);
      expect(skillsType).to.be.instanceof(GraphQLList);
    });

    it('should has string in ofType', () => {
      const skillsType = arrayToGraphQL(fields.skills);
      expect(skillsType.ofType.name).to.equal('String');
    });
  });

  describe('enumToGraphQL()', () => {
    it('should be instance of GraphQLEnumType', () => {
      const genderEnum = enumToGraphQL(fields.gender);
      expect(genderEnum).be.instanceof(GraphQLEnumType);
    });

    it('should have type name `Enum${FieldName}`', () => {
      const genderEnum = enumToGraphQL(fields.gender);
      expect(genderEnum.name).to.equal('EnumGender');
    });

    it('should pass all enum values to GQ type', () => {
      const genderEnum = enumToGraphQL(fields.gender);
      expect(genderEnum._values.length).to.equal(fields.gender.enumValues.length);
      expect(genderEnum._values[0].value).to.equal(fields.gender.enumValues[0]);
    });
  });

  describe('embeddedToGraphQL()', () => {
    it('should set name to graphql type', () => {
      const embeddedType = embeddedToGraphQL(fields.contacts);
      expect(embeddedType.name).to.equal('UserContacts');
    });

    it('should have embedded fields', () => {
      const embeddedType = embeddedToGraphQL(fields.contacts);
      const embeddedFields = embeddedType._typeConfig.fields();
      expect(embeddedFields.email).to.be.ok;
      expect(embeddedFields.locationId).to.be.ok;
      expect(embeddedFields._id).to.be.undefined;
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
      expect(result).deep.property('data.user').to.deep.equal({
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
      expect(result2).deep.property('data.user').to.deep.equal({
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
      expect(languagesType).to.be.instanceof(GraphQLList);
    });

    it('should has Language type in ofType', () => {
      // see src/__mocks__/languageSchema.js where type name `Language` is defined
      expect(languagesType.ofType.name).to.equal('Language');
    });

    it('should skip pseudo mongoose _id field in document', () => {
      expect(languagesFields._id).to.be.undefined;
    });
  });

  describe('mixedToGraphQL()', () => {
    let user;
    const UserTC = composeWithMongoose(UserModel);

    before('add test user document to mongoDB', (done) => {
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
      user.save(done);
    });

    it('should produce GraphQLJSON', () => {
      const someDynamicType = mixedToGraphQL(fields.someDynamic);
      expect(someDynamicType).to.equal(GraphQLJSON);
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
      expect(result).deep.property('data.user.name').to.equals(user.name);
      expect(result)
        .deep.property('data.user.someDynamic')
        .deep.equals(user.someDynamic);
    });
  });

  describe('referenceToGraphQL()', () => {
    it('should return type of field', () => {
      expect(referenceToGraphQL(fields.user)).equal(GraphQLMongoID);
    });
  });
});
