/* @flow */

import { Resolver, schemaComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import findOne from '../findOne';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

let UserTC;
let user1;
let user2;

beforeEach(async () => {
  schemaComposer.clear();
  UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);

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

describe('findOne() ->', () => {
  it('should return Resolver object', () => {
    const resolver = findOne(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = findOne(UserModel, UserTC);
      expect(resolver.hasArg('filter')).toBe(true);
    });

    it('should have `filter` arg only with indexed fields', async () => {
      const resolver = findOne(UserModel, UserTC, {
        filter: { onlyIndexed: true, operators: false },
      });
      expect(resolver.getArgTC('filter').getFieldNames()).toEqual(
        expect.arrayContaining(['_id', 'name', 'employment'])
      );
    });

    it('should have `filter` arg with required `name` field', async () => {
      const resolver = findOne(UserModel, UserTC, {
        filter: { requiredFields: 'name' },
      });
      expect(resolver.getArgTC('filter').getFieldType('name')).toBeInstanceOf(GraphQLNonNull);
    });

    it('should have `skip` arg', () => {
      const resolver = findOne(UserModel, UserTC);
      expect(resolver.hasArg('skip')).toBe(true);
    });

    it('should have `sort` arg', () => {
      const resolver = findOne(UserModel, UserTC);
      expect(resolver.hasArg('sort')).toBe(true);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findOne(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return one document if args is empty', async () => {
      const result = await findOne(UserModel, UserTC).resolve({ args: {} });
      expect(typeof result).toBe('object');
      expect([user1.name, user2.name]).toContain(result.name);
    });

    it('should return document if provided existed id', async () => {
      const result = await findOne(UserModel, UserTC).resolve({
        args: { id: user1._id },
      });
      expect(result.name).toBe(user1.name);
    });

    it('should skip records', async () => {
      const result = await findOne(UserModel, UserTC).resolve({ args: { skip: 2000 } });
      expect(result).toBeNull();
    });

    it('should sort records', async () => {
      const result1 = await findOne(UserModel, UserTC).resolve({
        args: { sort: { _id: 1 } },
      });

      const result2 = await findOne(UserModel, UserTC).resolve({
        args: { sort: { _id: -1 } },
      });

      expect(`${result1._id}`).not.toBe(`${result2._id}`);
    });

    it('should return mongoose document', async () => {
      const result = await findOne(UserModel, UserTC).resolve({
        args: { _id: user1._id },
      });
      expect(result).toBeInstanceOf(UserModel);
    });
  });

  describe('Resolver.getType()', () => {
    it('should return model type', () => {
      const outputType = findOne(UserModel, UserTC).getType();
      expect(outputType).toBe(UserTC.getType());
    });
  });
});
