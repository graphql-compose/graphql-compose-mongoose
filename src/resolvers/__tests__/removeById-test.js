/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, schemaComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import removeById from '../removeById';
import GraphQLMongoID from '../../types/mongoid';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('removeById() ->', () => {
  let UserTC;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    UserTC.setRecordIdFn(source => (source ? `${source._id}` : ''));
  });

  let user;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
    });

    await user.save();
  });

  it('should return Resolver object', () => {
    const resolver = removeById(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_id` arg', () => {
      const resolver = removeById(UserModel, UserTC);
      expect(resolver.hasArg('_id')).toBe(true);
      const argConfig: any = resolver.getArgConfig('_id');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType).toBe(GraphQLMongoID);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeById(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args._id is empty', async () => {
      const result = removeById(UserModel, UserTC).resolve({ args: {} });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should return payload.recordId', async () => {
      const result = await removeById(UserModel, UserTC).resolve({
        args: {
          _id: user.id,
        },
      });
      expect(result.recordId).toBe(user.id);
    });

    it('should remove document in database', async () => {
      await removeById(UserModel, UserTC).resolve({
        args: {
          _id: user.id,
        },
      });

      await expect(UserModel.findOne({ _id: user._id })).resolves.toBeNull();
    });

    it('should return payload.record', async () => {
      const result = await removeById(UserModel, UserTC).resolve({
        args: {
          _id: user.id,
        },
      });
      expect(result.record.id).toBe(user.id);
    });

    it('should pass empty projection to findById and got full document data', async () => {
      const result = await removeById(UserModel, UserTC).resolve({
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
      const result = await removeById(UserModel, UserTC).resolve({
        args: { _id: user.id },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with founded `record` and `resolveParams` as args', async () => {
      let beforeMutationId;
      const result = await removeById(UserModel, UserTC).resolve({
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
      const result = removeById(UserModel, UserTC).resolve({
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
      const outputType: any = removeById(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`RemoveById${UserTC.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType: any = removeById(UserModel, UserTC).getType();
      const typeComposer = schemaComposer.createObjectTC(outputType);
      expect(typeComposer.hasField('recordId')).toBe(true);
      expect(typeComposer.getFieldType('recordId')).toBe(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType: any = removeById(UserModel, UserTC).getType();
      const typeComposer = schemaComposer.createObjectTC(outputType);
      expect(typeComposer.hasField('record')).toBe(true);
      expect(typeComposer.getFieldType('record')).toBe(UserTC.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveById${UserTC.getTypeName()}Payload`;
      const existedType = schemaComposer.createObjectTC(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = removeById(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });
  });
});
