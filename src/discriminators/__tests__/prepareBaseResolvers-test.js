/* @flow */

import { graphql } from 'graphql-compose';
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

      resolvers.forEach(resolver => {
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
        expect(resolver.getArgTC(interestArgs[0]).getFieldConfig(DKeyFieldName).type).toEqual(
          CharacterDTC.getDKeyETC().getType()
        );
      }
    });

    it('should set DKey field type to DKeyETC on record args', () => {
      for (const resolver of resolversWithRecordArgs) {
        expect(interestArgs[1]).toEqual('record');
        if (resolver.name === 'createOne') {
          expect(resolver.getArgTC(interestArgs[1]).getFieldConfig(DKeyFieldName).type).toEqual(
            graphql.GraphQLNonNull(DKeyETC.getType())
          );
        } else {
          expect(resolver.getArgTC(interestArgs[1]).getFieldConfig(DKeyFieldName).type).toEqual(
            DKeyETC.getType()
          );
        }
      }
    });

    it('should set DKey field type to DKeyETC on records args', () => {
      for (const resolver of resolversWithRecordsArgs) {
        expect(interestArgs[2]).toEqual('records');
        expect(resolver.getArgTC(interestArgs[2]).getFieldConfig(DKeyFieldName).type).toEqual(
          graphql.GraphQLNonNull(DKeyETC.getType())
        );
      }
    });
  });

  describe('createOne: Resolver', () => {
    const resolver = CharacterDTC.getResolver('createOne');
    it('should set resolver record field type to DInterface', () => {
      expect(resolver.getTypeComposer().getFieldType('record')).toEqual(DInterfaceTC.getType());
    });
  });

  describe('createMany: Resolver', () => {
    const resolver = CharacterDTC.getResolver('createMany');
    it('should set resolver records field type to NonNull Plural DInterface', () => {
      expect(resolver.getTypeComposer().getFieldType('records')).toEqual(
        new graphql.GraphQLNonNull(graphql.GraphQLList(DInterfaceTC.getType()))
      );
    });
  });

  describe('findById: Resolver', () => {
    const resolver = CharacterDTC.getResolver('findByIds');
    it('should set resolver type to DInterface List', () => {
      expect(resolver.getType()).toEqual(
        graphql.GraphQLList(CharacterDTC.getDInterface().getType())
      );
    });
  });

  describe('findMany: Resolver', () => {
    it('should set resolver type to DInterface List', () => {
      expect(CharacterDTC.getResolver('findMany').getType()).toEqual(
        graphql.GraphQLList(DInterfaceTC.getType())
      );
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
    expect(
      CharacterDTC.getResolver('updateOne')
        .getTypeComposer()
        .getFieldType('record')
    ).toEqual(CharacterDTC.getDInterface().getType());
  });

  it('should set resolver record field type to DInterface, updateById', () => {
    expect(
      CharacterDTC.getResolver('updateById')
        .getTypeComposer()
        .getFieldType('record')
    ).toEqual(CharacterDTC.getDInterface().getType());
  });

  it('should set resolver record field type to DInterface, ', () => {
    expect(
      CharacterDTC.getResolver('removeById')
        .getTypeComposer()
        .getFieldType('record')
    ).toEqual(CharacterDTC.getDInterface().getType());
  });

  it('should set DKey field type to NonNull(DKeyETC) on record arg, createOne', () => {
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
    ).toEqual(graphql.GraphQLList(CharacterDTC.getDInterface().getType()));
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
