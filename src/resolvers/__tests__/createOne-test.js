/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, schemaComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import createOne from '../createOne';
import { convertModelToGraphQL } from '../../fieldsConverter';
import GraphQLMongoID from '../../types/mongoid';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('createOne() ->', () => {
  let UserTC;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    UserTC.setRecordIdFn((source) => (source ? `${source._id}` : ''));
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  it('should return Resolver object', () => {
    const resolver = createOne(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `record` arg', () => {
      const resolver = createOne(UserModel, UserTC);
      const argConfig: any = resolver.getArgConfig('record');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType.name).toBe('CreateOneUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = createOne(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.record is empty', async () => {
      const result = createOne(UserModel, UserTC).resolve({ args: {} });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should return payload.recordId', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { name: 'newName' },
        },
      });
      expect(result.recordId).toBeTruthy();
    });

    it('should create document with args.record', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { name: 'newName' },
        },
      });
      expect(result.record.name).toBe('newName');
    });

    it('should save document to database', async () => {
      const checkedName = 'nameForMongoDB';
      const res = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { name: checkedName },
        },
      });

      const doc = await UserModel.collection.findOne({ _id: res.record._id });
      expect(doc.n).toBe(checkedName);
    });

    it('should return payload.record', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { name: 'NewUser' },
        },
      });
      expect(result.record.id).toBe(result.recordId);
    });

    it('should return payload.errors', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { valid: 'AlwaysFails' },
        },
      });
      expect(result.errors).toEqual([
        { messages: ['Path `n` is required.'], path: 'n' },
        { messages: ['this is a validate message'], path: 'valid' },
      ]);
    });

    it('should return empty payload.errors', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { n: 'foo' },
        },
      });
      expect(result.errors).toEqual(null);
    });

    it('should return mongoose document', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: { record: { name: 'NewUser' } },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with created `record` and `resolveParams` as args', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: { record: { name: 'NewUser' } },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record, rp) => {
          record.name = 'OverridedName';
          record.someDynamic = rp.context.ip;
          return record;
        },
      });
      expect(result.record).toBeInstanceOf(UserModel);
      expect(result.record.name).toBe('OverridedName');
      expect(result.record.someDynamic).toBe('1.1.1.1');
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const resolver = createOne(UserModel, UserTC);
      expect(resolver.getTypeName()).toBe(`CreateOne${UserTC.getTypeName()}Payload`);
      expect(resolver.getArgITC('record').getFieldTypeName('name')).toBe('String!');
      expect(resolver.getArgITC('record').getFieldTypeName('age')).toBe('Float');
    });

    it('should have recordId field', () => {
      const outputType: any = createOne(UserModel, UserTC).getType();
      const recordIdField = schemaComposer.createObjectTC(outputType).getFieldConfig('recordId');
      expect(recordIdField.type).toBe(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType: any = createOne(UserModel, UserTC).getType();
      const recordField = schemaComposer.createObjectTC(outputType).getFieldConfig('record');
      expect(recordField.type).toBe(UserTC.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `CreateOne${UserTC.getTypeName()}Payload`;
      const existedType = schemaComposer.createObjectTC(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = createOne(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });
  });
});
