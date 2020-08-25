/* eslint-disable no-param-reassign */

import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import createOne from '../createOne';
import { convertModelToGraphQL } from '../../fieldsConverter';
import GraphQLMongoID from '../../types/MongoID';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('createOne() ->', () => {
  let UserTC: ObjectTypeComposer;

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
      expect(resolver.getArgTypeName('record')).toBe('CreateOneUserInput!');
    });

    it('should have user.contacts.mail required field', () => {
      const resolver = createOne(UserModel, UserTC);
      expect(resolver.getArgITC('record').getFieldITC('contacts').getFieldTypeName('email')).toBe(
        'String!'
      );
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
          record: { name: 'newName', contacts: { email: 'mail' } },
        },
      });
      expect(result.recordId).toBeTruthy();
    });

    it('should create document with args.record', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { name: 'newName', contacts: { email: 'mail' } },
        },
      });
      expect(result.record.name).toBe('newName');
    });

    it('should save document to database', async () => {
      const checkedName = 'nameForMongoDB';
      const res = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { name: checkedName, contacts: { email: 'mail' } },
        },
      });

      const doc = await UserModel.collection.findOne({ _id: res.record._id });
      expect(doc.n).toBe(checkedName);
    });

    it('should return payload.record', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { name: 'NewUser', contacts: { email: 'mail' } },
        },
      });
      expect(result.record.id).toBe(result.recordId);
    });

    it('should return resolver runtime error in payload.error', async () => {
      const resolver = createOne(UserModel, UserTC);
      await expect(resolver.resolve({ projection: { error: true } })).resolves.toEqual({
        error: expect.objectContaining({
          message: expect.stringContaining('requires at least one value in args'),
        }),
      });

      // should throw error if error not requested in graphql query
      await expect(resolver.resolve({})).rejects.toThrowError(
        'requires at least one value in args'
      );
    });

    it('should return validation error in payload.error', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { valid: 'AlwaysFails', contacts: { email: 'mail' } },
        },
        projection: {
          error: true,
        },
      });
      // TODO: FIX error
      expect(result.error).toEqual(
        [
          { message: 'Path `n` is required.', path: 'n', value: undefined },
          { message: 'this is a validate message', path: 'valid', value: 'AlwaysFails' },
        ][0] // <---- [0] remove after preparation correct ValidationErrorsType
      );
    });

    it('should throw GraphQLError if client does not request errors field in payload', async () => {
      await expect(
        createOne(UserModel, UserTC).resolve({
          args: {
            record: { valid: 'AlwaysFails', contacts: { email: 'mail' } },
          },
        })
      ).rejects.toThrowError(
        'User validation failed: n: Path `n` is required., valid: this is a validate message'
      );
    });

    it('should return empty payload.error', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: {
          record: { n: 'foo', contacts: { email: 'mail' } },
        },
      });
      expect(result.error).toEqual(undefined);
    });

    it('should return mongoose document', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: { record: { name: 'NewUser', contacts: { email: 'mail' } } },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with created `record` and `resolveParams` as args', async () => {
      const result = await createOne(UserModel, UserTC).resolve({
        args: { record: { name: 'NewUser', contacts: { email: 'mail' } } },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record: any, rp: ExtendedResolveParams) => {
          record.name = 'OverriddenName';
          record.someDynamic = rp.context.ip;
          return record;
        },
      });
      expect(result.record).toBeInstanceOf(UserModel);
      expect(result.record.name).toBe('OverriddenName');
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
