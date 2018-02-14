/* @flow */

import { Resolver, schemaComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import findMany from '../findMany';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('findMany() ->', () => {
  let UserTC;

  beforeEach(() => {
    schemaComposer.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
  });

  let user1;
  let user2;

  beforeEach(async () => {
    await UserModel.remove({});

    user1 = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
    });

    user2 = new UserModel({
      name: 'userName2',
      skills: ['go', 'erlang'],
      gender: 'female',
      relocation: false,
    });

    await Promise.all([user1.save(), user2.save()]);
  });

  it('should return Resolver object', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  it('Resolver object should have `filter` arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.hasArg('filter')).toBe(true);
  });

  it('Resolver object should have `limit` arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.hasArg('limit')).toBe(true);
  });

  it('Resolver object should have `skip` arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.hasArg('skip')).toBe(true);
  });

  it('Resolver object should have `sort` arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.hasArg('sort')).toBe(true);
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled Promise', async () => {
      const result = findMany(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return array of documents if args is empty', async () => {
      const result = await findMany(UserModel, UserTC).resolve({});

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result.map(d => d.name)).toEqual(expect.arrayContaining([user1.name, user2.name]));
    });

    it('should limit records', async () => {
      const result = await findMany(UserModel, UserTC).resolve({ args: { limit: 1 } });

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
    });

    it('should skip records', async () => {
      const result = await findMany(UserModel, UserTC).resolve({ args: { skip: 1000 } });

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });

    it('should sort records', async () => {
      const result1 = await findMany(UserModel, UserTC).resolve({
        args: { sort: { _id: 1 } },
      });

      const result2 = await findMany(UserModel, UserTC).resolve({
        args: { sort: { _id: -1 } },
      });

      expect(`${result1[0]._id}`).not.toBe(`${result2[0]._id}`);
    });

    it('should return mongoose documents', async () => {
      const result = await findMany(UserModel, UserTC).resolve({ args: { limit: 2 } });
      expect(result[0]).toBeInstanceOf(UserModel);
      expect(result[1]).toBeInstanceOf(UserModel);
    });
  });
});
