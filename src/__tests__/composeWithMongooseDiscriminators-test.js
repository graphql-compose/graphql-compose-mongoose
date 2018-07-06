import { GraphQLInterfaceType } from 'graphql';
import { graphql, schemaComposer, SchemaComposer, InputTypeComposer } from 'graphql-compose';
import { getCharacterModels } from '../__mocks__/characterModels';
import { MovieModel } from '../__mocks__/movieModel';
import {
  ChildDiscriminatorTypeComposer,
  composeWithMongooseDiscriminators,
  DiscriminatorTypeComposer,
} from '../composeWithMongooseDiscriminators';

beforeAll(() => MovieModel.base.connect());
afterAll(() => MovieModel.base.disconnect());

export const allowedDKeys = ['type', 'kind', 'error'];

const { CharacterModel, PersonModel, DroidModel } = getCharacterModels(allowedDKeys[0]);

describe('composeWithMongooseDiscriminators ->', () => {
  beforeEach(() => {
    schemaComposer.clear();
    CharacterModel.schema._gqcTypeComposer = undefined;
    PersonModel.schema._gqcTypeComposer = undefined;
    DroidModel.schema._gqcTypeComposer = undefined;
    MovieModel.schema._gqcTypeComposer = undefined;
  });

  describe('basics', () => {
    it('should create and return a DiscriminatorTypeComposer', () => {
      expect(composeWithMongooseDiscriminators(CharacterModel)).toBeInstanceOf(
        DiscriminatorTypeComposer
      );
    });

    it('should return a childDiscriminatorTypeComposer', () => {
      expect(
        composeWithMongooseDiscriminators(CharacterModel).discriminator(PersonModel)
      ).toBeInstanceOf(ChildDiscriminatorTypeComposer);
    });

    it('should have an interface, accessed with getDInterface', () => {
      const cDTC = composeWithMongooseDiscriminators(CharacterModel);
      expect(cDTC.getDInterface()).toBeInstanceOf(GraphQLInterfaceType);
    });
  });

  describe('composeWithMongoose customisationOptions', () => {
    it('required input fields, should be passed down to resolvers', () => {
      const typeComposer = composeWithMongooseDiscriminators(CharacterModel, {
        customizationOptions: {
          inputType: {
            fields: {
              required: [allowedDKeys[1]],
            },
          },
        },
      });
      const filterArgInFindOne: any = typeComposer.getResolver('findOne').getArg('filter');
      const inputConposer = new InputTypeComposer(filterArgInFindOne.type);
      expect(inputConposer.isRequired(allowedDKeys[1])).toBe(true);
    });

    it('should proceed customizationOptions.inputType.fields.required', () => {
      const itc = composeWithMongooseDiscriminators(CharacterModel, {
        customizationOptions: {
          inputType: {
            fields: {
              required: ['name', 'friends'],
            },
          },
        },
      }).getInputTypeComposer();

      expect(itc.isRequired('name')).toBe(true);
      expect(itc.isRequired('friends')).toBe(true);
    });
  });

  describe('DInterface', () => {
    it('should have same field names as baseModel used to create it', () => {
      const cDTC = composeWithMongooseDiscriminators(CharacterModel);
      expect(cDTC.getFieldNames()).toEqual(
        expect.arrayContaining(Object.keys(cDTC.getDInterface().getFields()))
      );
    });

    it('should have field names synced with the baseTC', () => {
      const cDTC = composeWithMongooseDiscriminators(CharacterModel);

      expect(cDTC.getFieldNames()).toEqual(
        expect.arrayContaining(Object.keys(cDTC.getDInterface().getFields()))
      );

      cDTC.addFields({
        field1: 'String',
        field2: 'String',
      });

      expect(cDTC.getFieldNames()).toEqual(
        expect.arrayContaining(Object.keys(cDTC.getDInterface().getFields()))
      );
    });
  });

  describe('DiscriminatorTypeComposer', () => {
    it('should have as interface DInterface', () => {
      const cDTC = composeWithMongooseDiscriminators(CharacterModel);
      expect(cDTC.hasInterface(cDTC.getDInterface())).toBeTruthy();
    });

    describe('hasChildDTC(DName)', () => {
      const cDTC = composeWithMongooseDiscriminators(CharacterModel);
      const personModel = cDTC.discriminator(PersonModel);

      it('should check and return boolean if childDTC is available', () => {
        expect(cDTC.hasChildDTC(personModel.getDName())).toBeTruthy();
      });

      it('should be falsified as childDTC not found', () => {
        expect(cDTC.hasChildDTC('NOT_AVAILABE')).toBeFalsy();
      });
    });

    describe('addDFields(newDFields)', () => {
      const characterDTC = composeWithMongooseDiscriminators(CharacterModel);
      const personTC = characterDTC.discriminator(PersonModel);
      const droidTC = characterDTC.discriminator(DroidModel);
      const newFields = {
        field1: 'String',
        field2: 'String',
      };

      beforeAll(() => {
        characterDTC.addDFields(newFields);
      });

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

      it('should add fields to childTC', () => {
        expect(personTC.getFieldNames()).toEqual(expect.arrayContaining(Object.keys(newFields)));
        expect(droidTC.getFieldNames()).toEqual(expect.arrayContaining(Object.keys(newFields)));
      });
    });

    describe('extendDFields(fieldName, extensionDField)', () => {
      const characterDTC = composeWithMongooseDiscriminators(CharacterModel);
      const personTC = characterDTC.discriminator(PersonModel);
      const droidTC = characterDTC.discriminator(DroidModel);
      const fieldName = allowedDKeys[1];
      const fieldExtension = {
        type: 'String',
        description: 'Hello I am changed',
      };

      beforeAll(() => {
        characterDTC.extendDField(fieldName, fieldExtension);
      });

      it('should extend field on baseTC', () => {
        expect(characterDTC.getFieldType(fieldName).toString()).toEqual(graphql.GraphQLString.name);

        expect(characterDTC.getField(fieldName).description).toEqual(fieldExtension.description);
      });

      it('should extend field type on DInterface', () => {
        expect(characterDTC.getDInterface().getFields()[fieldName]).toBeTruthy();
        expect(
          characterDTC
            .getDInterface()
            .getFields()
            [fieldName].type.toString()
        ).toEqual(fieldExtension.type);
      });

      it('should extend field on childTC', () => {
        expect(personTC.getFieldType(fieldName).toString()).toEqual(graphql.GraphQLString.name);

        expect(personTC.getField(fieldName).description).toEqual(fieldExtension.description);

        expect(droidTC.getFieldType(fieldName).toString()).toEqual(graphql.GraphQLString.name);

        expect(droidTC.getField(fieldName).description).toEqual(fieldExtension.description);
      });
    });

    describe('discriminator()', () => {
      let sc;
      let characterDTC;

      beforeEach(() => {
        sc = new SchemaComposer();
        characterDTC = composeWithMongooseDiscriminators(CharacterModel, {
          customizationOptions: { schemaComposer: sc },
        });
      });

      it('should return an instance of ChildDiscriminatorTypeComposer', () => {
        expect(characterDTC.discriminator(PersonModel)).toBeInstanceOf(
          ChildDiscriminatorTypeComposer
        );
        expect(characterDTC.discriminator(DroidModel)).toBeInstanceOf(
          ChildDiscriminatorTypeComposer
        );
      });

      it('should register itself in childDiscriminatorTC(CDTC) array', () => {
        const childTC = characterDTC.discriminator(DroidModel);
        expect(characterDTC.hasChildDTC(childTC.getDName())).toBeTruthy();
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

  describe('ChildDiscriminatorTypeComposer', () => {
    it('should have as an interface DInterface', () => {
      const cDTC = composeWithMongooseDiscriminators(CharacterModel);
      expect(cDTC.discriminator(DroidModel).getInterfaces()).toEqual(
        expect.arrayContaining(Array.of(cDTC.getDInterface()))
      );
    });

    it('should have all resolvers', () => {});
  });
});
