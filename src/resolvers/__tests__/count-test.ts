import { ObjectTypeComposer, Resolver, schemaComposer } from 'graphql-compose';
import { GraphQLInt } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import { count } from '../count';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('count() ->', () => {
  let UserTC: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
  });

  let user1;
  let user2;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user1 = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
      contacts: {
        email: '`1@1.com',
      },
    });

    user2 = new UserModel({
      name: 'userName2',
      skills: ['go', 'erlang'],
      gender: 'female',
      relocation: false,
      contacts: {
        email: '`2@2.com',
      },
    });

    await user1.save();
    await user2.save();
  });

  it('should return Resolver object', () => {
    const resolver = count(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = count(UserModel, UserTC);
      expect(resolver.hasArg('filter')).toBe(true);
    });

    it('required model fields (filter.contacts.email) should be optional in filter arg', () => {
      const resolver = count(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldITC('contacts').toSDL({ omitDescriptions: true }))
        .toMatchInlineSnapshot(`
        "input FilterCountUserContactsInput {
          phones: [String]
          email: String
          skype: String
          locationId: MongoID
          _id: MongoID
        }"
      `);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = count(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return total number of documents in collection if args is empty', async () => {
      const result = await count(UserModel, UserTC).resolve({ args: {} });
      expect(result).toBe(2);
    });

    it('should return number of document by filter data', async () => {
      const result = await count(UserModel, UserTC).resolve({
        args: { filter: { gender: 'male' } },
      });
      expect(result).toBe(1);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const mongooseActions: any[] = [];

      UserModel.base.set('debug', function debugMongoose(...args: any[]) {
        mongooseActions.push(args);
      });

      const result = await count(UserModel, UserTC).resolve({
        args: {},
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toHaveProperty('exec');
          expect(rp.model).toBe(UserModel);
          // modify query before execution
          return query.limit(1);
        },
      });
      expect(mongooseActions).toEqual([
        [
          'users',
          'countDocuments',
          {},
          {
            limit: 1,
          },
        ].filter(Boolean),
      ]);

      expect(result).toBe(1);
    });

    it('should override result with `beforeQuery`', async () => {
      const result = await count(UserModel, UserTC).resolve({
        args: {},
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toHaveProperty('exec');
          expect(rp.model).toBe(UserModel);
          return 1989;
        },
      });
      expect(result).toBe(1989);
    });
  });

  describe('Resolver.getType()', () => {
    it('should return GraphQLInt type', () => {
      const outputType = count(UserModel, UserTC).getType();
      expect(outputType).toBe(GraphQLInt);
    });
  });
});
