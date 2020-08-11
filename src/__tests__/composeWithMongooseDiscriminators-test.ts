import { schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { getCharacterModels } from '../discriminators/__mocks__/characterModels';
import { MovieModel } from '../discriminators/__mocks__/movieModel';
import { composeWithMongooseDiscriminators } from '../composeWithMongooseDiscriminators';
import { DiscriminatorTypeComposer } from '../discriminators';

beforeAll(() => MovieModel.base.createConnection());
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

    it('should return a ObjectTypeComposer as childTC on discriminator() call', () => {
      expect(
        composeWithMongooseDiscriminators(CharacterModel).discriminator(PersonModel)
      ).toBeInstanceOf(ObjectTypeComposer);
    });
  });

  describe('composeWithMongoose customizationOptions', () => {
    it('required input fields, should be passed down to resolvers', () => {
      const typeComposer = composeWithMongooseDiscriminators(CharacterModel, {
        inputType: {
          fields: {
            required: ['kind'],
          },
        },
      });
      const ac: any = typeComposer.getResolver('createOne').getArgTC('record');
      expect(ac.isFieldNonNull('kind')).toBe(true);
    });

    it('should proceed customizationOptions.inputType.fields.required', () => {
      const itc = composeWithMongooseDiscriminators(CharacterModel, {
        inputType: {
          fields: {
            required: ['name', 'friends'],
          },
        },
      }).getInputTypeComposer();

      expect(itc.isFieldNonNull('name')).toBe(true);
      expect(itc.isFieldNonNull('friends')).toBe(true);
    });

    it('should be passed down record opts to resolvers', () => {
      const typeComposer = composeWithMongooseDiscriminators(CharacterModel, {
        resolvers: {
          createOne: {
            record: {
              removeFields: ['friends'],
              requiredFields: ['name'],
            },
          },
        },
      });
      const createOneRecordArgTC = typeComposer.getResolver('createOne').getArgITC('record');
      expect(createOneRecordArgTC.isFieldNonNull('name')).toBe(true);
      expect(createOneRecordArgTC.hasField('friends')).toBe(false);
    });

    it('should pass down records opts to createMany resolver', () => {
      const typeComposer = composeWithMongooseDiscriminators(CharacterModel, {
        resolvers: {
          createMany: {
            records: {
              removeFields: ['friends'],
              requiredFields: ['name'],
            },
          },
        },
      });
      const createManyRecordsArgTC = typeComposer.getResolver('createMany').getArgITC('records');
      expect(createManyRecordsArgTC.isFieldNonNull('name')).toBe(true);
      expect(createManyRecordsArgTC.hasField('friends')).toBe(false);
    });
  });
});
