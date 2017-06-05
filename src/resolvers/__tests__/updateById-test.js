/* @flow */
/* eslint-disable no-param-reassign */

import {
  GraphQLNonNull,
  GraphQLInputObjectType,
  getNullableType,
  GraphQLObjectType,
} from 'graphql';
import { Resolver, TypeComposer, InputTypeComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import updateById from '../updateById';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

describe('updateById() ->', () => {
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
      relocation: true,
    });

    await Promise.all([user1.save(), user2.save()]);
  });

  it('should return Resolver object', () => {
    const resolver = updateById(UserModel, UserTypeComposer);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `record` arg', () => {
      const resolver = updateById(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('record');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType.name).toBe('UpdateByIdUserInput');
    });

    it('should have `record._id` required arg', () => {
      const resolver = updateById(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('record') || {};
      expect(argConfig.type.ofType).toBeInstanceOf(GraphQLInputObjectType);
      if (argConfig.type && argConfig.type.ofType) {
        const _idFieldType = new InputTypeComposer(argConfig.type.ofType).getFieldType('_id');
        expect(_idFieldType).toBeInstanceOf(GraphQLNonNull);
        expect(getNullableType(_idFieldType)).toBe(GraphQLMongoID);
      }
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateById(UserModel, UserTypeComposer).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.record._id is empty', async () => {
      const result = updateById(UserModel, UserTypeComposer).resolve({ args: { record: {} } });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should return payload.recordId', async () => {
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: { _id: user1.id, name: 'some name' },
        },
      });
      expect(result.recordId).toBe(user1.id);
    });

    it('should change data via args.record in model', async () => {
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: { _id: user1.id, name: 'newName' },
        },
      });
      expect(result.record.name).toBe('newName');
    });

    it('should change data via args.record in database', async () => {
      const checkedName = 'nameForMongoDB';
      await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: { _id: user1.id, name: checkedName },
        },
      });

      await expect(UserModel.findOne({ _id: user1._id })).resolves.toEqual(
        expect.objectContaining({ name: checkedName })
      );
    });

    it('should return payload.record', async () => {
      const checkedName = 'anyName123';
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: { _id: user1.id, name: checkedName },
        },
      });
      expect(result.record.id).toBe(user1.id);
      expect(result.record.name).toBe(checkedName);
    });

    it('should pass empty projection to findById and got full document data', async () => {
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: {
            _id: user1.id,
          },
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
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: { record: { _id: user1.id } },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with founded `record` and `resolveParams` as args', async () => {
      let beforeMutationId;
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: { record: { _id: user1.id } },
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
      const result = updateById(UserModel, UserTypeComposer).resolve({
        args: { record: { _id: user1.id, name: 'new name' } },
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
      const outputType = updateById(UserModel, UserTypeComposer).getType();
      expect(outputType.name).toBe(`UpdateById${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = updateById(UserModel, UserTypeComposer).getType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('recordId')).toBe(true);
      expect(typeComposer.getField('recordId').type).toBe(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = updateById(UserModel, UserTypeComposer).getType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('record')).toBe(true);
      expect(typeComposer.getField('record').type).toBe(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `UpdateById${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = updateById(UserModel, UserTypeComposer).getType();
      expect(outputType).toBe(existedType);
    });
  });
});
