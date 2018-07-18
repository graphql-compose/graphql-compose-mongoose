/* @flow */

import { schemaComposer } from 'graphql-compose';
import { getCharacterModels } from '../__mocks__/characterModels';
import { composeWithMongooseDiscriminators } from '../../composeWithMongooseDiscriminators';

const { CharacterModel, PersonModel } = getCharacterModels('type');

describe('prepareChildResolvers()', () => {
  describe('copyResolverArgTypes()', () => {
    afterAll(() => {
      schemaComposer.clear();
    });
    // Note childResolver Arg fields are copied from baseResolver
    const baseDTC = composeWithMongooseDiscriminators(CharacterModel, {
      resolvers: {
        createOne: {
          requiredFields: ['kind'],
        },
      },
    });
    const PersonTC = baseDTC.discriminator(PersonModel);

    it('should copy base common ResolverArgTypes to child', () => {
      expect(
        baseDTC
          .getResolver('createOne')
          .getArgTC('record')
          .getFieldType('kind')
      ).toEqual(
        PersonTC.getResolver('createOne')
          .getArgTC('record')
          .getFieldType('kind')
      );
    });
  });
});
