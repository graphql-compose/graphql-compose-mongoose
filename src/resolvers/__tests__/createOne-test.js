/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer, schemaComposer } from 'graphql-compose';
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
    UserModel.schema._gqcTypeComposer = undefined;
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    UserTC.setRecordIdFn(source => (source ? `${source._id}` : ''));
  });

  beforeEach(async () => {
    await UserModel.remove({});
  });

  it('should return Resolver object', () => {
    const resolver = createOne(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `record` arg', () => {
      const resolver = createOne(UserModel, UserTC);
      const argConfig: any = resolver.getArg('record');
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
      expect(doc.name).toBe(checkedName);
    });

    it('should return payload.record', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { name: 'NewUser' },
        },
      });
      expect(result.record.id).toBe(result.recordId);
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
      const outputType: any = createOne(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`CreateOne${UserTC.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType: any = createOne(UserModel, UserTC).getType();
      const recordIdField = new TypeComposer(outputType).getField('recordId');
      expect(recordIdField.type).toBe(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType: any = createOne(UserModel, UserTC).getType();
      const recordField = new TypeComposer(outputType).getField('record');
      expect(recordField.type).toBe(UserTC.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `CreateOne${UserTC.getTypeName()}Payload`;
      const existedType = TypeComposer.create(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = createOne(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });
  });
});
