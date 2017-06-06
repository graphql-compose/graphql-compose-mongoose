/* @flow */

import { Query } from 'mongoose';
import { Resolver, TypeComposer, graphql } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import removeMany from '../removeMany';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const { GraphQLInt, GraphQLNonNull, GraphQLObjectType } = graphql;

describe('removeMany() ->', () => {
  let UserTypeComposer;

  beforeEach(() => {
    typeStorage.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTypeComposer = composeWithMongoose(UserModel);
  });

  let user1;
  let user2;
  let user3;

  beforeEach(async () => {
    await UserModel.remove({});

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
    const resolver = removeMany(UserModel, UserTypeComposer);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `filter` arg', () => {
      const resolver = removeMany(UserModel, UserTypeComposer);
      const filterField = resolver.getArg('filter');
      expect(filterField).toBeTruthy();
      expect(filterField.type).toBeInstanceOf(GraphQLNonNull);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeMany(UserModel, UserTypeComposer).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = removeMany(UserModel, UserTypeComposer).resolve({ args: {} });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should remove data in database', async () => {
      await removeMany(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
        },
      });

      await expect(UserModel.findOne({ _id: user1._id })).resolves.toBeNull();
    });

    it('should not remove unsuitable data to filter in database', async () => {
      await removeMany(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
        },
      });
      await expect(UserModel.findOne({ _id: user2._id })).resolves.toBeDefined();
    });

    it('should return payload.numAffected', async () => {
      const result = await removeMany(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { gender: 'female' },
        },
      });
      expect(result.numAffected).toBe(2);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;
      const result = await removeMany(UserModel, UserTypeComposer).resolve({
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
      const outputType = removeMany(UserModel, UserTypeComposer).getType();
      expect(outputType.name).toBe(`RemoveMany${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType = removeMany(UserModel, UserTypeComposer).getType();
      const numAffectedField = new TypeComposer(outputType).getField('numAffected');
      expect(numAffectedField.type).toBe(GraphQLInt);
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveMany${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = removeMany(UserModel, UserTypeComposer).getType();
      expect(outputType).toBe(existedType);
    });
  });
});
