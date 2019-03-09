/* @flow */

import { Query } from 'mongoose';
import { Resolver, TypeComposer, schemaComposer } from 'graphql-compose';
import { GraphQLInt, GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import removeMany from '../removeMany';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('removeMany() ->', () => {
  let UserTC;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
  });

  let user1;
  let user2;
  let user3;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user1 = new UserModel({
      name: 'userName1',
      gender: 'male',
      relocation: true,
      age: 28,
    });

    user2 = new UserModel({
      name: 'userName2',
      gender: 'female',
      relocation: true,
      age: 29,
    });

    user3 = new UserModel({
      name: 'userName3',
      gender: 'female',
      relocation: true,
      age: 30,
    });

    await Promise.all([user1.save(), user2.save(), user3.save()]);
  });

  it('should return Resolver object', () => {
    const resolver = removeMany(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `filter` arg', () => {
      const resolver = removeMany(UserModel, UserTC);
      const filterField = resolver.getArgConfig('filter');
      expect(filterField).toBeTruthy();
      expect(filterField.type).toBeInstanceOf(GraphQLNonNull);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeMany(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = removeMany(UserModel, UserTC).resolve({ args: {} });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should remove data in database', async () => {
      await removeMany(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
        },
      });

      await expect(UserModel.findOne({ _id: user1._id })).resolves.toBeNull();
    });

    it('should not remove unsuitable data to filter in database', async () => {
      await removeMany(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
        },
      });
      await expect(UserModel.findOne({ _id: user2._id })).resolves.toBeDefined();
    });

    it('should return payload.numAffected', async () => {
      const result = await removeMany(UserModel, UserTC).resolve({
        args: {
          filter: { gender: 'female' },
        },
      });
      expect(result.numAffected).toBe(2);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;
      const result = await removeMany(UserModel, UserTC).resolve({
        args: {
          filter: { gender: 'female' },
        },
        beforeQuery: query => {
          expect(query).toBeInstanceOf(Query);
          beforeQueryCalled = true;
          return query;
        },
      });
      expect(beforeQueryCalled).toBe(true);
      expect(result.numAffected).toBe(2);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType: any = removeMany(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`RemoveMany${UserTC.getTypeName()}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType: any = removeMany(UserModel, UserTC).getType();
      const numAffectedField = new TypeComposer(outputType).getFieldConfig('numAffected');
      expect(numAffectedField.type).toBe(GraphQLInt);
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveMany${UserTC.getTypeName()}Payload`;
      const existedType = TypeComposer.create('outputTypeName');
      schemaComposer.set(outputTypeName, existedType);
      const outputType = removeMany(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });
  });
});
