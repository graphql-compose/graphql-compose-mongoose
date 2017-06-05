/* @flow */

import { GraphQLInt } from 'graphql';
import { Resolver } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import count from '../count';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

describe('count() ->', () => {
  let UserTypeComposer;

  beforeEach(() => {
    typeStorage.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTypeComposer = composeWithMongoose(UserModel);
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

    await Promise.all([
      user1.save(),
      user2.save(),
    ]);
  });

  it('should return Resolver object', () => {
    const resolver = count(UserModel, UserTypeComposer);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = count(UserModel, UserTypeComposer);
      expect(resolver.hasArg('filter')).toBe(true);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = count(UserModel, UserTypeComposer).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return total number of documents in collection if args is empty', async () => {
      const result = await count(UserModel, UserTypeComposer).resolve({ args: {} });
      expect(result).toBe(2);
    });

    it('should return number of document by filter data', async () => {
      const result = await count(UserModel, UserTypeComposer).resolve(
        { args: { filter: { gender: 'male' } } }
      );
      expect(result).toBe(1);
    });
  });

  describe('Resolver.getType()', () => {
    it('should return GraphQLInt type', () => {
      const outputType = count(UserModel, UserTypeComposer).getType();
      expect(outputType).toBe(GraphQLInt);
    });
  });
});
