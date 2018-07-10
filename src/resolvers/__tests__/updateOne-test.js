/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer, schemaComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import updateOne from '../updateOne';
import GraphQLMongoID from '../../types/mongoid';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('updateOne() ->', () => {
  let UserTC;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    UserTC.setRecordIdFn(source => (source ? `${source._id}` : ''));
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
      relocation: true,
    });

    await Promise.all([user1.save(), user2.save()]);
  });

  it('should return Resolver object', () => {
    const resolver = updateOne(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = updateOne(UserModel, UserTC);
      expect(resolver.hasArg('filter')).toBe(true);
    });

    it('should have `skip` arg', () => {
      const resolver = updateOne(UserModel, UserTC);
      expect(resolver.hasArg('skip')).toBe(true);
    });

    it('should have `sort` arg', () => {
      const resolver = updateOne(UserModel, UserTC);
      expect(resolver.hasArg('sort')).toBe(true);
    });

    it('should have required `record` arg', () => {
      const resolver = updateOne(UserModel, UserTC);
      const argConfig: any = resolver.getArgConfig('record');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType.name).toBe('UpdateOneUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateOne(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = updateOne(UserModel, UserTC).resolve({ args: {} });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should return payload.recordId', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result.recordId).toBe(user1.id);
    });

    it('should change data via args.record in model', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: 'newName' },
        },
      });
      expect(result.record.name).toBe('newName');
    });

    it('should change data via args.record in database', async () => {
      const checkedName = 'nameForMongoDB';
      await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: checkedName },
        },
      });

      await expect(UserModel.findOne({ _id: user1._id })).resolves.toEqual(
        expect.objectContaining({
          name: checkedName,
        })
      );
    });

    it('should return payload.record', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result.record.id).toBe(user1.id);
    });

    it('should skip records', async () => {
      const result1 = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          skip: 0,
        },
      });
      const result2 = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          skip: 1,
        },
      });
      expect(result1.record.id).not.toBe(result2.record.id);
    });

    it('should sort records', async () => {
      const result1 = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          sort: { _id: 1 },
        },
      });
      const result2 = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          sort: { _id: -1 },
        },
      });
      expect(result1.record.id).not.toBe(result2.record.id);
    });

    it('should pass empty projection to findOne and got full document data', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
        },
        projection: {
          record: {
            name: true,
          },
        },
      });
      expect(result.record.id).toBe(user1.id);
      expect(result.record.name).toBe(user1.name);
      expect(result.record.gender).toBe(user1.gender);
    });

    it('should return mongoose document', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with founded `record`  and `resolveParams` as args', async () => {
      let beforeMutationId;
      const result = await updateOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id } },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record, rp) => {
          beforeMutationId = record.id;
          record.someDynamic = rp.context.ip;
          return record;
        },
      });
      expect(result.record).toBeInstanceOf(UserModel);
      expect(result.record.someDynamic).toBe('1.1.1.1');
      expect(beforeMutationId).toBe(user1.id);
    });

    it('`beforeRecordMutate` may reject operation', async () => {
      const result = updateOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id }, record: { name: 'new name' } },
        context: { readOnly: true },
        beforeRecordMutate: (record, rp) => {
          if (rp.context.readOnly) {
            return Promise.reject(new Error('Denied due context ReadOnly'));
          }
          return record;
        },
      });
      await expect(result).rejects.toMatchSnapshot();
      const exist = await UserModel.collection.findOne({ _id: user1._id });
      expect(exist.name).toBe(user1.name);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType: any = updateOne(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`UpdateOne${UserTC.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType: any = updateOne(UserModel, UserTC).getType();
      const recordIdField = new TypeComposer(outputType).getFieldConfig('recordId');
      expect(recordIdField.type).toBe(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType: any = updateOne(UserModel, UserTC).getType();
      const recordField = new TypeComposer(outputType).getFieldConfig('record');
      expect(recordField.type).toBe(UserTC.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `UpdateOne${UserTC.getTypeName()}Payload`;
      const existedType = TypeComposer.create(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = updateOne(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });
  });
});
