/* @flow */

import { schemaComposer, graphql, TypeComposer, InterfaceTypeComposer } from 'graphql-compose';
import { getCharacterModels } from '../../__mocks__/characterModels';
import { composeWithMongooseDiscriminators } from '../../composeWithMongooseDiscriminators';

const { CharacterModel, PersonModel, DroidModel } = getCharacterModels('type');

describe('DiscriminatorTypeComposer', () => {
  beforeEach(() => schemaComposer.clear());

  it('should have as interface DInterface', () => {
    const baseDTC = composeWithMongooseDiscriminators(CharacterModel);
    expect(baseDTC.hasInterface(baseDTC.getDInterface())).toBeTruthy();
  });

  describe('DInterface', () => {
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

      beforeAll(() =>
        baseDTC.addFields({
          field1: 'String',
          field2: 'String',
        }));

      expect(baseDTC.getFieldNames()).toEqual(Object.keys(baseDTC.getDInterface().getFields()));
    });
  });

  describe('hasChildTC(DName)', () => {
    const baseDTC = composeWithMongooseDiscriminators(CharacterModel);
    const personModel = baseDTC.discriminator(PersonModel);

    it('should check and return true if childTC is available', () => {
      expect(baseDTC.hasChildTC(personModel.getTypeName())).toBeTruthy();
    });

    it('should be falsified as childTC not found', () => {
      expect(baseDTC.hasChildTC('NOT_AVAILABLE')).toBeFalsy();
    });
  });

  describe('addFields(newFields)', () => {
    const characterDTC = composeWithMongooseDiscriminators(CharacterModel);
    const personTC = characterDTC.discriminator(PersonModel);
    const droidTC = characterDTC.discriminator(DroidModel);

    const personFields = personTC.getFieldNames();
    const droidFields = droidTC.getFieldNames();

    const newFields = {
      field1: 'String',
      field2: 'String',
    };

    beforeAll(() => {
      characterDTC.addFields(newFields);
    });

    it('should add fields to baseTC', () => {
      expect(characterDTC.getFieldNames()).toEqual(expect.arrayContaining(Object.keys(newFields)));
    });

    it('should add fields to DInterface', () => {
      expect(Object.keys(characterDTC.getDInterface().getFields())).toEqual(
        expect.arrayContaining(Object.keys(newFields))
      );
    });

    it('should add fields to childTC', () => {
      expect(personTC.getFieldNames()).toEqual(expect.arrayContaining(Object.keys(newFields)));
      expect(droidTC.getFieldNames()).toEqual(expect.arrayContaining(Object.keys(newFields)));
    });

    it('should have exactly plus two fields added to array', () => {
      expect(droidTC.getFieldNames()).toEqual(droidFields.concat(Object.keys(newFields)));
      expect(personTC.getFieldNames()).toEqual(personFields.concat(Object.keys(newFields)));
    });
  });

  describe('removeField(fieldName)', () => {
    const characterDTC = composeWithMongooseDiscriminators(CharacterModel);
    const personTC = characterDTC.discriminator(PersonModel);
    const droidTC = characterDTC.discriminator(DroidModel);
    const fieldCounts = {
      person: personTC.getFieldNames().length,
      droid: droidTC.getFieldNames().length,
    };

    const field = 'friends';

    beforeAll(() => {
      characterDTC.removeField(field);
    });

    it('should remove fields from baseTC', () => {
      expect(characterDTC.hasField(field)).toBeFalsy();
    });

    it('should remove fields from DInterface', () => {
      expect(characterDTC.getDInterface().getFields()[field]).toBeFalsy();
    });

    it('should remove fields from childTC', () => {
      expect(personTC.hasField(field)).toBeFalsy();
      expect(droidTC.hasField(field)).toBeFalsy();
    });

    it('should remove only specified fields', () => {
      expect(droidTC.getFieldNames().length - 1).toBe(fieldCounts.droid);
      expect(personTC.getFieldNames().length - 1).toBe(fieldCounts.person);
    });
  });

  describe('extendFields(fieldName, extensionField)', () => {
    const characterDTC = composeWithMongooseDiscriminators(CharacterModel);
    const personTC = characterDTC.discriminator(PersonModel);
    const droidTC = characterDTC.discriminator(DroidModel);
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
      expect(personTC.getFieldType(fieldName).toString()).toEqual(graphql.GraphQLString.name);

      expect((personTC.getField(fieldName): any).description).toEqual(fieldExtension.description);

      expect(droidTC.getFieldType(fieldName).toString()).toEqual(graphql.GraphQLString.name);

      expect((droidTC.getField(fieldName): any).description).toEqual(fieldExtension.description);
    });
  });

  describe('discriminator()', () => {
    let characterDTC;

    beforeEach(() => {
      schemaComposer.clear();
      characterDTC = composeWithMongooseDiscriminators(CharacterModel);
    });

    it('should return an instance of TypeComposer as childTC', () => {
      expect(characterDTC.discriminator(PersonModel)).toBeInstanceOf(TypeComposer);
      expect(characterDTC.discriminator(DroidModel)).toBeInstanceOf(TypeComposer);
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
  });
});
