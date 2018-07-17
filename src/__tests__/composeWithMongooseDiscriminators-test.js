/* @flow */

import { InputTypeComposer, schemaComposer, TypeComposer } from 'graphql-compose';
import { getCharacterModels } from '../discriminators/__mocks__/characterModels';
import { MovieModel } from '../discriminators/__mocks__/movieModel';
import { composeWithMongooseDiscriminators } from '../composeWithMongooseDiscriminators';
import { DiscriminatorTypeComposer } from '../discriminators';

beforeAll(() => MovieModel.base.connect());
afterAll(() => MovieModel.base.disconnect());

const { CharacterModel, PersonModel } = getCharacterModels('type');

describe('composeWithMongooseDiscriminators ->', () => {
  beforeEach(() => {
    schemaComposer.clear();
  });

  describe('basics', () => {
    it('should create and return a DiscriminatorTypeComposer', () => {
      expect(composeWithMongooseDiscriminators(CharacterModel)).toBeInstanceOf(
        DiscriminatorTypeComposer
      );
    });

    it('should return a TypeComposer as childTC on discriminator() call', () => {
      expect(
        composeWithMongooseDiscriminators(CharacterModel).discriminator(PersonModel)
      ).toBeInstanceOf(TypeComposer);
    });
  });

  describe('composeWithMongoose customisationOptions', () => {
    it('required input fields, should be passed down to resolvers', () => {
      const typeComposer = composeWithMongooseDiscriminators(CharacterModel, {
        inputType: {
          fields: {
            required: ['kind'],
          },
        },
      });
      const filterArgInFindOne: any = typeComposer.getResolver('findOne').getArg('filter');
      const inputComposer = new InputTypeComposer(filterArgInFindOne.type);
      expect(inputComposer.isRequired('kind')).toBe(true);
    });

    it('should proceed customizationOptions.inputType.fields.required', () => {
      const itc = composeWithMongooseDiscriminators(CharacterModel, {
        inputType: {
          fields: {
            required: ['name', 'friends'],
          },
        },
      }).getInputTypeComposer();

      expect(itc.isRequired('name')).toBe(true);
      expect(itc.isRequired('friends')).toBe(true);
    });
  });
});
