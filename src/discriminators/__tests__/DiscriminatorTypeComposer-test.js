/* @flow */

import {
  SchemaComposer,
  schemaComposer,
  graphql,
  ObjectTypeComposer,
  InterfaceTypeComposer,
} from 'graphql-compose';
import { getCharacterModels } from '../__mocks__/characterModels';
import { MovieModel } from '../__mocks__/movieModel';
import { composeWithMongoose } from '../../composeWithMongoose';
import { composeWithMongooseDiscriminators } from '../../composeWithMongooseDiscriminators';

const { CharacterModel, PersonModel, DroidModel } = getCharacterModels('type');

describe('DiscriminatorTypeComposer', () => {
  it('should have as interface DInterface', () => {
    const baseDTC = composeWithMongooseDiscriminators(CharacterModel);
    expect(baseDTC.hasInterface(baseDTC.getDInterface())).toBeTruthy();
  });

  describe('DInterface', () => {
    afterAll(() => schemaComposer.clear());
    const baseDTC = composeWithMongooseDiscriminators(CharacterModel);

    it('should have same field names as baseModel used to create it', () => {
      expect(baseDTC.getFieldNames()).toEqual(
        expect.arrayContaining(Object.keys(baseDTC.getDInterface().getFields()))
      );
    });

    it('should be accessed with getDInterface', () => {
      expect(baseDTC.getDInterface()).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should have field names synced with the baseTC', () => {
      expect(baseDTC.getFieldNames()).toEqual(Object.keys(baseDTC.getDInterface().getFields()));

      beforeAll(() => {
        baseDTC.addFields({
          field1: 'String',
          field2: 'String',
        });
      });

      expect(baseDTC.getFieldNames()).toEqual(Object.keys(baseDTC.getDInterface().getFields()));
    });
  });

  describe('class methods', () => {
    let characterDTC;
    let personTC;
    let droidTC;

    describe('hasChildTC(DName)', () => {
      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        personTC = characterDTC.discriminator(PersonModel);
      });

      it('should check and return true if childTC is available', () => {
        expect(characterDTC.hasChildTC(personTC.getTypeName())).toBeTruthy();
      });

      it('should be falsified as childTC not found', () => {
        expect(characterDTC.hasChildTC('NOT_AVAILABLE')).toBeFalsy();
      });
    });

    describe('setFields(fields)', () => {
      let personSpecificFields;
      let droidSpecificFields;
      let fieldsToSet;

      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);

        personSpecificFields = personTC.getFieldNames().filter(v => !characterDTC.hasField(v));
        droidSpecificFields = droidTC.getFieldNames().filter(v => !characterDTC.hasField(v));

        fieldsToSet = {
          kind: 'String',
          appearsIn: 'String',
          field1: 'String',
          field2: 'String',
        };

        characterDTC.setFields(fieldsToSet);
      });

      afterAll(() => schemaComposer.clear());

      it('should set fields to baseTC', () => {
        expect(characterDTC.getFieldNames()).toEqual(Object.keys(fieldsToSet));
      });

      it('should sets fields to DInterface', () => {
        expect(Object.keys(characterDTC.getDInterface().getFields())).toEqual(
          Object.keys(fieldsToSet)
        );
      });

      it('should set fields to childTC', () => {
        expect(personTC.getFieldNames()).toEqual(expect.arrayContaining(Object.keys(fieldsToSet)));
        expect(droidTC.getFieldNames()).toEqual(expect.arrayContaining(Object.keys(fieldsToSet)));
      });

      it('should keep child specific fields', () => {
        expect(droidTC.getFieldNames()).toEqual(expect.arrayContaining(droidSpecificFields));
        expect(personTC.getFieldNames()).toEqual(expect.arrayContaining(personSpecificFields));
      });

      it('should contain total of fieldsToSet and child specific fields', () => {
        expect(droidTC.getFieldNames().length).toBe(droidSpecificFields.length + 4);
        expect(personTC.getFieldNames().length).toBe(personSpecificFields.length + 4);
      });
    });

    describe('setField(fieldName, fieldConfig)', () => {
      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);
      });
      const fieldName = 'myField';
      const fieldConfig = {
        type: 'String',
      };

      beforeAll(() => {
        characterDTC.setField(fieldName, fieldConfig);
      });

      afterAll(() => schemaComposer.clear());

      it('should set field on baseTC', () => {
        expect(characterDTC.getFieldType(fieldName)).toEqual(graphql.GraphQLString);
      });

      it('should set field on DInterface', () => {
        expect(characterDTC.getDInterface().getFieldType(fieldName)).toEqual(graphql.GraphQLString);
      });

      it('should set field on childTC', () => {
        expect(droidTC.getFieldType(fieldName)).toEqual(graphql.GraphQLString);
        expect(personTC.getFieldType(fieldName)).toEqual(graphql.GraphQLString);
      });
    });

    describe('addFields(newFields)', () => {
      let personSpecificFields;
      let droidSpecificFields;

      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);

        personSpecificFields = personTC.getFieldNames().filter(v => !characterDTC.hasField(v));
        droidSpecificFields = droidTC.getFieldNames().filter(v => !characterDTC.hasField(v));
      });

      const newFields = {
        field1: 'String',
        field2: 'String',
      };

      beforeAll(() => {
        characterDTC.addFields(newFields);
      });

      afterAll(() => schemaComposer.clear());

      it('should add fields to baseTC', () => {
        expect(characterDTC.getFieldNames()).toEqual(
          expect.arrayContaining(Object.keys(newFields))
        );
      });

      it('should add fields to DInterface', () => {
        expect(Object.keys(characterDTC.getDInterface().getFields())).toEqual(
          expect.arrayContaining(Object.keys(newFields))
        );
      });

      it('should have exactly plus two fields added to childTC fields', () => {
        expect(droidTC.getFieldNames().sort()).toEqual(
          [...characterDTC.getFieldNames(), ...droidSpecificFields].sort()
        );
        expect(personTC.getFieldNames().sort()).toEqual(
          [...characterDTC.getFieldNames(), ...personSpecificFields].sort()
        );
      });
    });

    describe('addNestedFields(newFields)', () => {
      let personFields;
      let droidFields;

      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);

        personFields = personTC.getFieldNames();
        droidFields = droidTC.getFieldNames();
      });

      const newFields = {
        'field1.nested': 'String',
        'field2.nested': 'String',
      };

      beforeAll(() => {
        characterDTC.addNestedFields(newFields);
      });

      afterAll(() => schemaComposer.clear());

      it('should add field to baseTC', () => {
        expect(characterDTC.getFieldOTC('field1').getFieldType('nested')).toEqual(
          graphql.GraphQLString
        );
      });

      it('should add field to DInterface', () => {
        expect(
          characterDTC
            .getDInterface()
            .getFieldOTC('field1')
            .getFieldType('nested')
        ).toEqual(graphql.GraphQLString);
      });

      it('should have exactly plus two fields added to childTC fields', () => {
        expect(droidTC.getFieldOTC('field1').getFieldType('nested')).toEqual(graphql.GraphQLString);
        expect(personTC.getFieldOTC('field2').getFieldType('nested')).toEqual(
          graphql.GraphQLString
        );
      });

      it('should have plus 2 field length on childTC', () => {
        expect(droidTC.getFieldNames().length).toBe(droidFields.length + 2);
        expect(personTC.getFieldNames().length).toBe(personFields.length + 2);
      });
    });

    describe('removeField(fieldName)', () => {
      let personFields;
      let droidFields;

      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);

        personFields = personTC.getFieldNames().filter(v => v !== 'friends');
        droidFields = droidTC.getFieldNames().filter(v => v !== 'friends');
      });

      const field = 'friends';

      beforeAll(() => {
        characterDTC.removeField(field);
      });

      afterAll(() => schemaComposer.clear());

      it('should remove fields from baseTC', () => {
        expect(characterDTC.hasField(field)).toBeFalsy();
      });

      it('should remove fields from DInterface', () => {
        expect(characterDTC.getDInterface().hasField(field)).toBeFalsy();
      });

      it('should remove fields from childTC', () => {
        expect(personTC.hasField(field)).toBeFalsy();
        expect(droidTC.hasField(field)).toBeFalsy();
      });

      it('should remove only DFields fields', () => {
        expect(droidTC.getFieldNames()).toEqual(droidFields);
        expect(personTC.getFieldNames()).toEqual(personFields);
      });
    });

    describe('removeOtherFields(fieldNames)', () => {
      let personSpecificFields;
      let droidSpecificFields;

      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);

        personSpecificFields = personTC.getFieldNames().filter(v => !characterDTC.hasField(v));
        droidSpecificFields = droidTC.getFieldNames().filter(v => !characterDTC.hasField(v));
      });
      const fields = ['type', 'friends'];

      beforeAll(() => {
        characterDTC.removeOtherFields(fields);
      });

      afterAll(() => schemaComposer.clear());

      it('should remove fields from baseTC', () => {
        expect(characterDTC.getFieldNames()).toEqual(fields);
      });

      it('should remove fields from DInterface', () => {
        expect(characterDTC.getDInterface().getFieldNames()).toEqual(fields);
      });

      it('should remove only DFields from childTC', () => {
        expect(personTC.getFieldNames()).toEqual([...fields, ...personSpecificFields]);
        expect(droidTC.getFieldNames()).toEqual([...fields, ...droidSpecificFields]);
      });
    });

    describe('extendFields(fieldName, extensionField)', () => {
      let personFields;
      let droidFields;

      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);

        personFields = personTC.getFieldNames();
        droidFields = droidTC.getFieldNames();
      });

      const fieldName = 'kind';
      const fieldExtension = {
        type: 'String',
        description: 'Hello I am changed',
      };

      beforeAll(() => {
        characterDTC.extendField(fieldName, fieldExtension);
      });

      it('should extend field on baseTC', () => {
        expect(characterDTC.getFieldType(fieldName).toString()).toEqual(graphql.GraphQLString.name);

        expect((characterDTC.getField(fieldName): any).description).toEqual(
          fieldExtension.description
        );
      });

      it('should extend field type on DInterface', () => {
        expect(characterDTC.getDInterface().getFields()[fieldName]).toBeTruthy();
        expect(
          characterDTC
            .getDInterface()
            .getFieldType(fieldName)
            .toString()
        ).toEqual(fieldExtension.type);
      });

      it('should extend field on childTC', () => {
        expect(personTC.getFieldType(fieldName)).toEqual(graphql.GraphQLString);

        expect((personTC.getField(fieldName): any).description).toEqual(fieldExtension.description);

        expect(droidTC.getFieldType(fieldName)).toEqual(graphql.GraphQLString);

        expect((droidTC.getField(fieldName): any).description).toEqual(fieldExtension.description);
      });

      it('should have same field length on childTC an others', () => {
        expect(droidTC.getFieldNames().length).toBe(droidFields.length);
        expect(personTC.getFieldNames().length).toBe(personFields.length);
      });
    });

    describe('makeFieldNonNull(fieldName), makeFieldNullable(fieldName), deprecateFields(fieldName)', () => {
      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);
      });

      const fieldNonNull = 'type';
      const fieldNullable = 'friends';
      const fieldDeprecated = 'kind';
      const deprecateMessage = 'Property was to be use for tests only';

      beforeAll(() => {
        characterDTC.makeFieldNonNull(fieldNonNull);
        characterDTC.makeFieldNonNull(fieldNullable);
        characterDTC.makeFieldNullable(fieldNullable);
        characterDTC.deprecateFields({ [fieldDeprecated]: deprecateMessage });
      });

      it('should effect fields on baseTC', () => {
        expect(characterDTC.isFieldNonNull(fieldNonNull)).toBeTruthy();
        expect(characterDTC.isFieldNonNull(fieldNullable)).toBeFalsy();
        expect(characterDTC.getFieldConfig(fieldDeprecated).deprecationReason).toBe(
          deprecateMessage
        );
      });

      it('should effect fields on DInterface', () => {
        const dInterface = characterDTC.getDInterface();

        expect(dInterface.isFieldNonNull(fieldNonNull)).toBeTruthy();
        expect(dInterface.isFieldNonNull(fieldNullable)).toBeFalsy();
        expect(dInterface.getFieldConfig(fieldDeprecated).deprecationReason).toBe(deprecateMessage);
      });

      it('should effect fields on childTC', () => {
        expect(personTC.isFieldNonNull(fieldNonNull)).toBeTruthy();
        expect(personTC.isFieldNonNull(fieldNullable)).toBeFalsy();
        expect(personTC.getFieldConfig(fieldDeprecated).deprecationReason).toBe(deprecateMessage);
        expect(droidTC.isFieldNonNull(fieldNonNull)).toBeTruthy();
        expect(droidTC.isFieldNonNull(fieldNullable)).toBeFalsy();
        expect(droidTC.getFieldConfig(fieldDeprecated).deprecationReason).toBe(deprecateMessage);
      });
    });

    describe('addRelation(fieldName, relationOpts)', () => {
      beforeAll(() => {
        schemaComposer.clear();

        characterDTC = composeWithMongooseDiscriminators(CharacterModel);
        droidTC = characterDTC.discriminator(DroidModel);
        personTC = characterDTC.discriminator(PersonModel);
      });

      const relationField = 'movies';
      const relationResolver = composeWithMongoose(MovieModel).getResolver('findMany');

      beforeAll(() => {
        characterDTC.addRelation(relationField, {
          resolver: relationResolver,
        });
      });

      it('should create relation on baseTC', () => {
        expect(characterDTC.getRelations()[relationField].resolver).toEqual(relationResolver);
      });

      it('should create field with type Movie on DInterface', () => {
        const dInterface = characterDTC.getDInterface();

        expect(dInterface.getFieldType(relationField)).toEqual(relationResolver.getType());
      });

      it('should create Movie relation on childTC', () => {
        expect(personTC.getRelations()[relationField].resolver).toEqual(relationResolver);
        expect(droidTC.getRelations()[relationField].resolver).toEqual(relationResolver);
      });
    });
  });

  describe('discriminator()', () => {
    let characterDTC;

    beforeEach(() => {
      characterDTC = composeWithMongooseDiscriminators(CharacterModel);
    });

    it('should return an instance of ObjectTypeComposer as childTC', () => {
      expect(characterDTC.discriminator(PersonModel)).toBeInstanceOf(ObjectTypeComposer);
      expect(characterDTC.discriminator(DroidModel)).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should register childTC in childTC(childTCs) array', () => {
      const childTC = characterDTC.discriminator(DroidModel);
      expect(characterDTC.hasChildTC(childTC.getTypeName())).toBeTruthy();
    });

    it('should apply filters passed', () => {
      const tc = characterDTC.discriminator(PersonModel, {
        fields: {
          remove: ['dob', 'starShips'],
        },
      });

      expect(tc.getFieldNames()).not.toEqual(expect.arrayContaining(['dob', 'starShips']));
    });

    it('should pass down baseTypeComposerResolverOptions', () => {
      const personTC = composeWithMongooseDiscriminators(CharacterModel, {
        schemaComposer: new SchemaComposer(),
        resolvers: {
          createOne: {
            record: {
              removeFields: ['friends'],
              requiredFields: ['name'],
            },
          },
        },
      }).discriminator(PersonModel, {
        resolvers: {
          createOne: {
            record: {
              requiredFields: ['dob'],
            },
          },
        },
      });
      const createOneRecordArgTC = personTC.getResolver('createOne').getArgITC('record');
      expect(createOneRecordArgTC.isRequired('name')).toBe(true);
      expect(createOneRecordArgTC.isRequired('dob')).toBe(true);
      expect(createOneRecordArgTC.hasField('friends')).toBe(false);
    });
  });
});
