/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer, graphql } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import removeById from '../removeById';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const { GraphQLNonNull, GraphQLObjectType } = graphql;

describe('removeById() ->', () => {
  let UserTypeComposer;

  beforeEach(() => {
    typeStorage.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTypeComposer = composeWithMongoose(UserModel);
  });

  let user;

  beforeEach(async () => {
    await UserModel.remove({});

    user = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
    });

    await user.save();
  });

  it('should return Resolver object', () => {
    const resolver = removeById(UserModel, UserTypeComposer);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_id` arg', () => {
      const resolver = removeById(UserModel, UserTypeComposer);
      expect(resolver.hasArg('_id')).toBe(true);
      const argConfig = resolver.getArg('_id');
      // $FlowFixMe
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      // $FlowFixMe
      expect(argConfig.type.ofType).toBe(GraphQLMongoID);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeById(UserModel, UserTypeComposer).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args._id is empty', async () => {
      const result = removeById(UserModel, UserTypeComposer).resolve({ args: {} });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should return payload.recordId', async () => {
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: user.id,
        },
      });
      expect(result.recordId).toBe(user.id);
    });

    it('should return error if document does not exist', () => {
      const unexistedId = '500000000000000000000000';
      const promise = removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: unexistedId,
        },
      });
      return expect(promise).rejects.toMatchSnapshot();
    });

    it('should remove document in database', async () => {
      await removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: user.id,
        },
      });

      await expect(UserModel.findOne({ _id: user._id })).resolves.toBeNull();
    });

    it('should return payload.record', async () => {
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: user.id,
        },
      });
      expect(result.record.id).toBe(user.id);
    });

    it('should pass empty projection to findById and got full document data', async () => {
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: user.id,
        },
        projection: {
          record: {
            name: true,
          },
        },
      });
      expect(result.record.id).toBe(user.id);
      expect(result.record.name).toBe(user.name);
      expect(result.record.gender).toBe(user.gender);
    });

    it('should return mongoose document', async () => {
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: { _id: user.id },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with founded `record` and `resolveParams` as args', async () => {
      let beforeMutationId;
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: { _id: user.id },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record, rp) => {
          beforeMutationId = record.id;
          record.someDynamic = rp.context.ip;
          return record;
        },
      });
      expect(result.record).toBeInstanceOf(UserModel);
      expect(result.record.someDynamic).toBe('1.1.1.1');
      expect(beforeMutationId).toBe(user.id);

      const empty = await UserModel.collection.findOne({ _id: user._id });
      expect(empty).toBe(null);
    });

    it('`beforeRecordMutate` may reject operation', async () => {
      const result = removeById(UserModel, UserTypeComposer).resolve({
        args: { _id: user.id },
        context: { readOnly: true },
        beforeRecordMutate: (record, rp) => {
          if (rp.context.readOnly) {
            return Promise.reject(new Error('Denied due context ReadOnly'));
          }
          return record;
        },
      });
      await expect(result).rejects.toMatchSnapshot();
      const exist = await UserModel.collection.findOne({ _id: user._id });
      expect(exist.name).toBe(user.name);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType = removeById(UserModel, UserTypeComposer).getType();
      // $FlowFixMe
      expect(outputType.name).toBe(`RemoveById${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = removeById(UserModel, UserTypeComposer).getType();
      // $FlowFixMe
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('recordId')).toBe(true);
      expect(typeComposer.getField('recordId').type).toBe(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = removeById(UserModel, UserTypeComposer).getType();
      // $FlowFixMe
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('record')).toBe(true);
      expect(typeComposer.getField('record').type).toBe(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveById${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = removeById(UserModel, UserTypeComposer).getType();
      expect(outputType).toBe(existedType);
    });
  });
});
