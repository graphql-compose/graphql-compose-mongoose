/* @flow */

import { Resolver, schemaComposer } from 'graphql-compose';
import { GraphQLInt } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import count from '../count';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('count() ->', () => {
  let UserTC;

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
    const resolver = count(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = count(UserModel, UserTC);
      expect(resolver.hasArg('filter')).toBe(true);
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
  });

  describe('Resolver.getType()', () => {
    it('should return GraphQLInt type', () => {
      const outputType = count(UserModel, UserTC).getType();
      expect(outputType).toBe(GraphQLInt);
    });
  });
});
