import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { pagination } from '../pagination';
import { findMany } from '../findMany';
import { count } from '../count';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('pagination() ->', () => {
  let UserTC: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer) as ObjectTypeComposer;
    UserTC.setResolver('findMany', findMany(UserModel, UserTC));
    UserTC.setResolver('count', count(UserModel, UserTC));
  });

  let user1: IUser;
  let user2: IUser;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user1 = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
      contacts: { email: 'mail' },
    });

    user2 = new UserModel({
      name: 'userName2',
      skills: ['go', 'erlang'],
      gender: 'female',
      relocation: false,
      contacts: { email: 'mail' },
    });

    await user1.save();
    await user2.save();
  });

  it('should return Resolver object', () => {
    const resolver = pagination(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  it('Resolver object should have `filter` arg', () => {
    const resolver = pagination(UserModel, UserTC);
    if (!resolver) throw new Error('Pagination resolver is undefined');
    expect(resolver.hasArg('filter')).toBe(true);
  });

  it('Resolver object should have `page` arg', () => {
    const resolver = pagination(UserModel, UserTC);
    if (!resolver) throw new Error('Pagination resolver is undefined');
    expect(resolver.hasArg('page')).toBe(true);
  });

  it('Resolver object should have `perPage` arg', () => {
    const resolver = pagination(UserModel, UserTC);
    if (!resolver) throw new Error('Pagination resolver is undefined');
    expect(resolver.hasArg('perPage')).toBe(true);
    expect(resolver.getArgConfig('perPage').defaultValue).toBe(20);
  });

  it('Resolver object should have `perPage` arg with custom default value', () => {
    const resolver = pagination(UserModel, UserTC, {
      perPage: 33,
    });
    if (!resolver) throw new Error('Pagination resolver is undefined');
    expect(resolver.hasArg('perPage')).toBe(true);
    expect(resolver.getArgConfig('perPage').defaultValue).toBe(33);
  });

  it('Resolver object should have `sort` arg', () => {
    const resolver = pagination(UserModel, UserTC);
    if (!resolver) throw new Error('Pagination resolver is undefined');
    expect(resolver.hasArg('sort')).toBe(true);
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled Promise', async () => {
      const resolver = pagination(UserModel, UserTC);
      if (!resolver) throw new Error('Pagination resolver is undefined');
      const result = resolver.resolve({ args: { page: 1, perPage: 20 } });
      await expect(result).resolves.toBeDefined();
    });

    it('should return array of documents in `items`', async () => {
      const resolver = pagination(UserModel, UserTC);
      if (!resolver) throw new Error('Pagination resolver is undefined');
      const result = await resolver.resolve({ args: { page: 1, perPage: 20 } });

      expect(result.items).toBeInstanceOf(Array);
      expect(result.items).toHaveLength(2);
      expect(result.items.map((d: any) => d.name)).toEqual(
        expect.arrayContaining([user1.name, user2.name])
      );
    });

    it('should limit records', async () => {
      const resolver = pagination(UserModel, UserTC);
      if (!resolver) throw new Error('Pagination resolver is undefined');
      const result = await resolver.resolve({ args: { page: 1, perPage: 1 } });

      expect(result.items).toBeInstanceOf(Array);
      expect(result.items).toHaveLength(1);
    });

    it('should skip records', async () => {
      const resolver = pagination(UserModel, UserTC);
      if (!resolver) throw new Error('Pagination resolver is undefined');
      const result = await resolver.resolve({ args: { page: 999, perPage: 10 } });

      expect(result.items).toBeInstanceOf(Array);
      expect(result.items).toHaveLength(0);
    });

    it('should sort records', async () => {
      const resolver = pagination(UserModel, UserTC);
      if (!resolver) throw new Error('Pagination resolver is undefined');

      const result1 = await resolver.resolve({
        args: { sort: { _id: 1 }, page: 1, perPage: 20 },
      });

      const result2 = await resolver.resolve({
        args: { sort: { _id: -1 }, page: 1, perPage: 20 },
      });

      expect(`${result1.items[0]._id}`).not.toBe(`${result2.items[0]._id}`);
    });

    it('should return mongoose documents', async () => {
      const resolver = pagination(UserModel, UserTC);
      if (!resolver) throw new Error('Pagination resolver is undefined');

      const result = await resolver.resolve({ args: { page: 1, perPage: 20 } });
      expect(result.items[0]).toBeInstanceOf(UserModel);
      expect(result.items[1]).toBeInstanceOf(UserModel);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const resolver = pagination(UserModel, UserTC);
      if (!resolver) throw new Error('Pagination resolver is undefined');

      const result = await resolver.resolve({
        args: { page: 1, perPage: 20 },
        beforeQuery(_: any, rp: ExtendedResolveParams) {
          expect(rp.model).toBe(UserModel);
          expect(rp.query).toHaveProperty('exec');
          return [{ overrides: true }];
        },
      });

      expect(result.items).toEqual([{ overrides: true }]);
    });
  });
});
