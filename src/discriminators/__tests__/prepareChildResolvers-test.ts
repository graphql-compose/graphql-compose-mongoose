import { schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { composeWithMongooseDiscriminators } from '../../composeWithMongooseDiscriminators';
import { getCharacterModels } from '../__mocks__/characterModels';

const DKeyFieldName = 'type';
const { CharacterModel, PersonModel } = getCharacterModels(DKeyFieldName);

beforeAll(() => CharacterModel.base.createConnection());
afterAll(() => CharacterModel.base.disconnect());

describe('prepareChildResolvers()', () => {
  describe('setQueryDKey()', () => {
    let PersonTC: ObjectTypeComposer<any, any>;

    beforeAll(() => {
      schemaComposer.clear();
      PersonTC = composeWithMongooseDiscriminators(CharacterModel).discriminator(PersonModel);
    });

    beforeEach(async () => {
      await PersonModel.deleteMany({});
    });

    it('should set DKey on createOne', async () => {
      const res = await PersonTC.getResolver('createOne').resolve({
        args: {
          record: { name: 'Agent 007', dob: 124343 },
        },
      });

      expect(res.record[DKeyFieldName]).toBe(PersonModel.modelName);
    });

    it('should set DKey on createMany', async () => {
      const res = await PersonTC.getResolver('createMany').resolve({
        args: {
          records: [
            { name: 'Agent 007', dob: 124343 },
            { name: 'Agent 007', dob: 124343 },
          ],
        },
      });

      expect(res.records[0][DKeyFieldName]).toBe(PersonModel.modelName);
      expect(res.records[1][DKeyFieldName]).toBe(PersonModel.modelName);
    });
  });

  describe('hideDKey()', () => {
    const resolversWithFilterArgs: any[] = [];
    const resolversWithRecordArgs: any[] = [];
    const resolversWithRecordsArgs: any[] = [];
    const interestArgs = ['filter', 'record', 'records'];

    beforeAll(() => {
      schemaComposer.clear();
      const PersonTC = composeWithMongooseDiscriminators(CharacterModel).discriminator(PersonModel);

      const resolvers = PersonTC.getResolvers();

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

    it('should hide DKey field on filter args', () => {
      for (const resolver of resolversWithFilterArgs) {
        expect(interestArgs[0]).toEqual('filter');
        expect(resolver.getArgITC(interestArgs[0]).hasField(DKeyFieldName)).toBeFalsy();
      }
    });

    it('should hide DKey field on record args', () => {
      for (const resolver of resolversWithRecordArgs) {
        expect(interestArgs[1]).toEqual('record');
        expect(resolver.getArgITC(interestArgs[1]).hasField(DKeyFieldName)).toBeFalsy();
      }
    });

    it('should hide DKey field on records args', () => {
      for (const resolver of resolversWithRecordsArgs) {
        expect(interestArgs[2]).toEqual('records');
        expect(resolver.getArgITC(interestArgs[2]).hasField(DKeyFieldName)).toBeFalsy();
      }
    });
  });

  describe('copyResolverArgTypes()', () => {
    afterAll(() => {
      schemaComposer.clear();
    });
    // Note childResolver Arg fields are copied from baseResolver
    const baseDTC = composeWithMongooseDiscriminators(CharacterModel, {
      resolvers: {
        createOne: {
          requiredFields: ['kind'],
        } as any,
      },
    });
    const PersonTC = baseDTC.discriminator(PersonModel);

    it('should copy base common ResolverArgTypes to child', () => {
      expect(baseDTC.getResolver('createOne').getArgITC('record').getFieldType('kind')).toEqual(
        PersonTC.getResolver('createOne').getArgITC('record').getFieldType('kind')
      );
    });
  });
});
