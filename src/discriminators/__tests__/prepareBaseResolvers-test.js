/* @flow */

import { composeWithMongooseDiscriminators } from '../../composeWithMongooseDiscriminators';
import { getCharacterModels } from '../__mocks__/characterModels';

const { CharacterModel } = getCharacterModels('type');

const CharacterDTC = composeWithMongooseDiscriminators(CharacterModel);
const DKeyFieldName = CharacterDTC.getDKey();
const DKeyETC = CharacterDTC.getDKeyETC();
const DInterfaceTC = CharacterDTC.getDInterface();

describe('prepareBaseResolvers()', () => {
  describe('setDKeyEnumOnITCArgs()', () => {
    const resolversWithFilterArgs = [];
    const resolversWithRecordArgs = [];
    const resolversWithRecordsArgs = [];
    const interestArgs = ['filter', 'record', 'records'];

    beforeAll(() => {
      const resolvers = CharacterDTC.getResolvers(); // map

      resolvers.forEach((resolver) => {
        const argNames = resolver.getArgNames();

        for (const argName of argNames) {
          if (argName === interestArgs[0]) {
            resolversWithFilterArgs.push(resolver);
          }
          if (argName === interestArgs[1]) {
            resolversWithRecordArgs.push(resolver);
          }
          if (argName === interestArgs[2]) {
            resolversWithRecordsArgs.push(resolver);
          }
        }
      });
    });

    it('should set DKey field type to DKeyETC on filter args', () => {
      for (const resolver of resolversWithFilterArgs) {
        expect(interestArgs[0]).toEqual('filter');
        expect(resolver.getArgITC(interestArgs[0]).getFieldTC(DKeyFieldName)).toEqual(
          CharacterDTC.getDKeyETC()
        );
      }
    });

    it('should set DKey field type to DKeyETC on record args', () => {
      for (const resolver of resolversWithRecordArgs) {
        expect(interestArgs[1]).toEqual('record');
        if (resolver.name === 'createOne') {
          expect(resolver.getArgITC(interestArgs[1]).isFieldNonNull(DKeyFieldName)).toBeTruthy();
          expect(resolver.getArgITC(interestArgs[1]).getFieldTC(DKeyFieldName)).toEqual(DKeyETC);
        } else {
          expect(resolver.getArgITC(interestArgs[1]).getFieldTC(DKeyFieldName)).toEqual(DKeyETC);
        }
      }
    });

    it('should set DKey field type to DKeyETC on records args', () => {
      for (const resolver of resolversWithRecordsArgs) {
        expect(interestArgs[2]).toEqual('records');
        expect(resolver.getArgITC(interestArgs[2]).isFieldNonNull(DKeyFieldName)).toBeTruthy();
        expect(resolver.getArgITC(interestArgs[2]).getFieldTC(DKeyFieldName)).toEqual(DKeyETC);
      }
    });
  });

  describe('createOne: Resolver', () => {
    const resolver = CharacterDTC.getResolver('createOne');
    it('should set resolver record field type to DInterface', () => {
      expect(resolver.getOTC().getFieldType('record')).toEqual(DInterfaceTC.getType());
    });
  });

  describe('createMany: Resolver', () => {
    const resolver = CharacterDTC.getResolver('createMany');
    it('should set resolver records field type to NonNull Plural DInterface', () => {
      expect(resolver.getOTC().getFieldTC('records')).toBe(DInterfaceTC);
      expect(resolver.getOTC().getFieldTypeName('records')).toBe('[CharacterInterface]!');
    });
  });

  describe('findById: Resolver', () => {
    const resolver = CharacterDTC.getResolver('findByIds');
    it('should set resolver type to DInterface List', () => {
      expect(resolver.getTypeComposer()).toEqual(CharacterDTC.getDInterface());
      expect(resolver.getTypeName()).toEqual('[CharacterInterface]');
    });
  });

  describe('findMany: Resolver', () => {
    it('should set resolver type to DInterface List', () => {
      expect(CharacterDTC.getResolver('findMany').getTypeComposer()).toEqual(DInterfaceTC);
      expect(CharacterDTC.getResolver('findMany').getTypeName()).toBe('[CharacterInterface]');
    });
  });

  it('should set resolver type to DInterface, findOne', () => {
    expect(CharacterDTC.getResolver('findOne').getType()).toEqual(
      CharacterDTC.getDInterface().getType()
    );
  });

  it('should set resolver type to DInterface, findById', () => {
    expect(CharacterDTC.getResolver('findById').getType()).toEqual(
      CharacterDTC.getDInterface().getType()
    );
  });

  it('should set resolver record field type to DInterface, updateOne', () => {
    expect(CharacterDTC.getResolver('updateOne').getOTC().getFieldType('record')).toEqual(
      CharacterDTC.getDInterface().getType()
    );
  });

  it('should set resolver record field type to DInterface, updateById', () => {
    expect(CharacterDTC.getResolver('updateById').getOTC().getFieldType('record')).toEqual(
      CharacterDTC.getDInterface().getType()
    );
  });

  it('should set resolver record field type to DInterface, ', () => {
    expect(CharacterDTC.getResolver('removeById').getOTC().getFieldType('record')).toEqual(
      CharacterDTC.getDInterface().getType()
    );
  });

  it('should set DKey field type to NonNull(DKeyETC) on record arg, createOne', () => {
    expect(
      CharacterDTC.getResolver('createOne').getArgITC('record').getFieldTC(CharacterDTC.getDKey())
    ).toEqual(CharacterDTC.getDKeyETC());
    expect(
      CharacterDTC.getResolver('createOne')
        .getArgITC('record')
        .getFieldTypeName(CharacterDTC.getDKey())
    ).toBe('EnumDKeyCharacterType!');
  });

  it('should set type on items in pagination resolver to DInterface List, pagination', () => {
    expect(CharacterDTC.getResolver('pagination').getOTC().getFieldTC('items')).toEqual(
      CharacterDTC.getDInterface()
    );
    expect(CharacterDTC.getResolver('pagination').getOTC().getFieldTypeName('items')).toBe(
      '[CharacterInterface]'
    );
  });

  it('should clone, rename edges field on connection resolver, connection', () => {
    const newName = `${CharacterDTC.getTypeName()}Edge`;
    const connectionRS = CharacterDTC.getResolver('connection');

    expect(connectionRS.getOTC().getFieldTC('edges').getTypeName()).toEqual(newName);
  });
});
