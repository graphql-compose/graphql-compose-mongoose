import { graphql } from 'graphql-compose';
import { getCharacterModels } from '../../../__mocks__/characterModels';
import { composeWithMongooseDiscriminators } from '../../../composeWithMongooseDiscriminators';

const { CharacterModel } = getCharacterModels('type');

const CharacterDTC = composeWithMongooseDiscriminators(CharacterModel);

describe('recomposeBaseResolvers()', () => {
  describe('setDKeyEnumOnITCArgs()', () => {
    const resolversWithFilterAndRecordArgs = [];
    const resolversWithFilterArgsOnly = [];
    const resolversWithRecordArgsOnly = [];
    const resolversWithNoInterestArgs = [];
    const interestArgs = ['filter', 'record'];

    beforeAll(() => {
      const resolvers = CharacterDTC.getResolvers(); // map

      resolvers.forEach(resolver => {
        if (resolver.hasArg(interestArgs[0]) && resolver.hasArg(interestArgs[1])) {
          resolversWithFilterAndRecordArgs.push(resolver);
        } else if (!(resolver.hasArg(interestArgs[0]) && resolver.hasArg(interestArgs[1]))) {
          resolversWithNoInterestArgs.push(resolver);
        } else if (resolver.hasArg(interestArgs[0]) && !resolver.hasArg(interestArgs[1])) {
          resolversWithFilterArgsOnly.push(resolver);
        } else if (!resolver.hasArg(interestArgs[0]) && resolver.hasArg(interestArgs[1])) {
          resolversWithRecordArgsOnly.push(resolver);
        }
      });
    });

    it('should set type to DKeyEnum on DKey field on filter and record args', () => {
      for (const resolver of resolversWithFilterAndRecordArgs) {
        for (const arg of interestArgs) {
          expect(resolver.getArgTC(arg).getFieldType(CharacterDTC.getDKey())).toEqual(
            CharacterDTC.getDKeyETC().getType()
          );
        }
      }
    });

    it('should set type to DKeyEnum on DKey field only on filter args', () => {
      for (const resolver of resolversWithFilterArgsOnly) {
        expect(interestArgs[0]).toEqual('filter');
        expect(resolver.getArgTC(interestArgs[0]).getFieldType(CharacterDTC.getDKey())).toEqual(
          CharacterDTC.getDKeyETC().getType()
        );
        expect(resolver.getArgTC(interestArgs[1]).getFieldType(CharacterDTC.getDKey())).not.toEqual(
          CharacterDTC.getDKeyETC().getType()
        );
      }
    });

    it('should set type to DKeyEnum on DKey field only on record args', () => {
      for (const resolver of resolversWithFilterArgsOnly) {
        expect(interestArgs[1]).toEqual('record');
        expect(resolver.getArgTC(interestArgs[1]).getFieldType(CharacterDTC.getDKey())).toEqual(
          CharacterDTC.getDKeyETC().getType()
        );
        expect(resolver.getArgTC(interestArgs[0]).getFieldType(CharacterDTC.getDKey())).not.toEqual(
          CharacterDTC.getDKeyETC().getType()
        );
      }
    });

    it('should NOT set type to DKeyEnum on DKey as filter and record not found args', () => {
      for (const resolver of resolversWithFilterArgsOnly) {
        for (const arg of interestArgs) {
          expect(resolver.hasArg(arg)).toBeFalsy();
        }
      }
    });
  });

  it('should set resolver type to DInterface List, findMany', () => {
    expect(CharacterDTC.getResolver('findMany').getType()).toEqual(
      graphql.GraphQLList(CharacterDTC.getDInterface())
    );
  });

  it('should set resolver type to DInterface List, findByIds', () => {
    expect(CharacterDTC.getResolver('findByIds').getType()).toEqual(
      graphql.GraphQLList(CharacterDTC.getDInterface())
    );
  });

  it('should set resolver type to DInterface, findOne', () => {
    expect(CharacterDTC.getResolver('findOne').getType()).toEqual(CharacterDTC.getDInterface());
  });

  it('should set resolver type to DInterface, findById', () => {
    expect(CharacterDTC.getResolver('findById').getType()).toEqual(CharacterDTC.getDInterface());
  });

  it('should set resolver record field type to DInterface, createOne', () => {
    expect(
      CharacterDTC.getResolver('createOne')
        .getTypeComposer()
        .getFieldType('record')
    ).toEqual(CharacterDTC.getDInterface());
  });

  it('should set resolver record field type to DInterface, updateOne', () => {
    expect(
      CharacterDTC.getResolver('updateOne')
        .getTypeComposer()
        .getFieldType('record')
    ).toEqual(CharacterDTC.getDInterface());
  });

  it('should set resolver record field type to DInterface, updateById', () => {
    expect(
      CharacterDTC.getResolver('updateById')
        .getTypeComposer()
        .getFieldType('record')
    ).toEqual(CharacterDTC.getDInterface());
  });

  it('should set resolver record field type to DInterface, ', () => {
    expect(
      CharacterDTC.getResolver('removeById')
        .getTypeComposer()
        .getFieldType('record')
    ).toEqual(CharacterDTC.getDInterface());
  });

  it('should set resolver record arg field, DKey to NonNull DKeyETC type, createOne', () => {
    expect(
      CharacterDTC.getResolver('createOne')
        .getArgTC('record')
        .getFieldType(CharacterDTC.getDKey())
    ).toEqual(graphql.GraphQLNonNull(CharacterDTC.getDKeyETC().getType()));
  });

  it('should set type on items in pagination resolver to DInterface List, pagination', () => {
    expect(
      CharacterDTC.getResolver('pagination')
        .getTypeComposer()
        .getFieldType('items')
    ).toEqual(graphql.GraphQLList(CharacterDTC.getDInterface()));
  });

  it('should clone, rename edges field on connection resolver, connection', () => {
    const newName = `${CharacterDTC.getTypeName()}Edge`;
    const connectionRS = CharacterDTC.getResolver('connection');

    expect(
      connectionRS
        .getTypeComposer()
        .getFieldTC('edges')
        .getTypeName()
    ).toEqual(newName);
  });
});
