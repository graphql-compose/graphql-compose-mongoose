/* @flow */

import { Query } from 'mongoose';
import { Resolver, schemaComposer } from 'graphql-compose';
import { GraphQLInt, GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import updateMany from '../updateMany';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('updateMany() ->', () => {
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
      relocation: true,
    });

    await Promise.all([user1.save(), user2.save()]);
  });

  it('should return Resolver object', () => {
    const resolver = updateMany(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.hasArg('filter')).toBe(true);
    });

    it('should have `limit` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.hasArg('limit')).toBe(true);
    });

    it('should have `skip` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.hasArg('skip')).toBe(true);
    });

    it('should have `sort` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.hasArg('sort')).toBe(true);
    });

    it('should have `record` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      const argConfig: any = resolver.getArgConfig('record');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType.name).toBe('UpdateManyUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateMany(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.record is empty', async () => {
      const result = updateMany(UserModel, UserTC).resolve({ args: {} });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should change data via args.record in database', async () => {
      const checkedName = 'nameForMongoDB';
      await updateMany(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: checkedName },
        },
      });

      await expect(UserModel.findOne({ _id: user1._id })).resolves.toEqual(
        expect.objectContaining({ name: checkedName })
      );
    });

    it('should return payload.numAffected', async () => {
      const result = await updateMany(UserModel, UserTC).resolve({
        args: {
          record: { gender: 'female' },
        },
      });
      expect(result.numAffected).toBe(2);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;
      const result = await updateMany(UserModel, UserTC).resolve({
        args: {
          record: { gender: 'female' },
        },
        beforeQuery: query => {
          expect(query).toBeInstanceOf(Query);
          beforeQueryCalled = true;
          // modify query before execution
          return query.where({ _id: user1.id });
        },
      });
      expect(beforeQueryCalled).toBe(true);
      expect(result.numAffected).toBe(1);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType: any = updateMany(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`UpdateMany${UserTC.getTypeName()}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType: any = updateMany(UserModel, UserTC).getType();
      const numAffectedField = schemaComposer
        .createOutputTC(outputType)
        .getFieldConfig('numAffected');
      expect(numAffectedField.type).toBe(GraphQLInt);
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `UpdateMany${UserTC.getTypeName()}Payload`;
      const existedType = schemaComposer.createOutputTC(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = updateMany(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });
  });
});
