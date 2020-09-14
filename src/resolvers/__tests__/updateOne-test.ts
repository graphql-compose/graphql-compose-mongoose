/* eslint-disable no-param-reassign */

import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { updateOne } from '../updateOne';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';
import { testFieldConfig } from '../../utils/testHelpers';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('updateOne() ->', () => {
  let UserTC: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    UserTC.setRecordIdFn((source) => (source ? `${source._id}` : ''));
  });

  let user1: IUser;
  let user2: IUser;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user1 = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
      contacts: { email: 'mail' },
    });

    user2 = new UserModel({
      name: 'userName2',
      skills: ['go', 'erlang'],
      gender: 'female',
      relocation: true,
      contacts: { email: 'mail' },
    });

    await user1.save();
    await user2.save();
  });

  it('should return Resolver object', () => {
    const resolver = updateOne(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` optional arg', () => {
      const resolver = updateOne(UserModel, UserTC);
      expect(resolver.getArgTypeName('filter')).toBe('FilterUpdateOneUserInput');
    });

    it('should have user.contacts.mail as optional field', () => {
      const resolver = updateOne(UserModel, UserTC);
      expect(resolver.getArgITC('record').getFieldITC('contacts').getFieldTypeName('email')).toBe(
        'String'
      );
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
      const result = updateOne(UserModel, UserTC).resolve({
        // @ts-expect-error
        args: {},
      });
      await expect(result).rejects.toThrow(
        'User.updateOne resolver requires at least one value in args.filter'
      );
    });

    it('should return payload.recordId when it requested', async () => {
      const result = await testFieldConfig({
        field: updateOne(UserModel, UserTC),
        args: { filter: { _id: user1.id }, record: {} },
        selection: `{
          recordId
        }`,
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
        args: { filter: { _id: user1.id }, record: { name: 'abc' } },
      });
      expect(result.record.id).toBe(user1.id);
    });

    it('should return resolver runtime error in payload.error', async () => {
      const resolver = updateOne(UserModel, UserTC);
      await expect(resolver.resolve({ projection: { error: true } })).resolves.toEqual({
        error: expect.objectContaining({
          message: expect.stringContaining('requires at least one value in args.filter'),
        }),
      });

      // should throw error if error not requested in graphql query
      await expect(resolver.resolve({})).rejects.toThrowError(
        'requires at least one value in args.filter'
      );
    });

    it('should return empty payload.error', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id }, record: { name: 'abc' } },
      });
      expect(result.error).toEqual(undefined);
    });

    it('should return payload.error', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          record: { valid: 'AlwaysFails' },
        },
        projection: {
          error: true,
        },
      });

      expect(result.error.message).toEqual(
        'User validation failed: valid: this is a validate message'
      );

      expect(result.error.errors).toEqual([
        {
          message: 'this is a validate message',
          path: 'valid',
          value: 'AlwaysFails',
        },
      ]);
    });

    it('should throw GraphQLError if client does not request errors field in payload', async () => {
      await expect(
        updateOne(UserModel, UserTC).resolve({
          args: {
            filter: { _id: user1.id },
            record: { valid: 'AlwaysFails' },
          },
        })
      ).rejects.toThrowError('User validation failed: valid: this is a validate message');
    });

    it('should skip records', async () => {
      const result1 = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          record: { name: 'abc' },
          skip: 0,
        },
      });
      const result2 = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          record: { name: 'abc' },
          skip: 1,
        },
      });
      expect(result1.record.id).not.toBe(result2.record.id);
    });

    it('should sort records', async () => {
      const result1 = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          record: { name: 'abc' },
          sort: { _id: 1 },
        },
      });
      const result2 = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          record: { name: 'abc' },
          sort: { _id: -1 },
        },
      });
      expect(result1.record.id).not.toBe(result2.record.id);
    });

    it('should pass empty projection to findOne and got full document data', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: 'abc' },
        },
        projection: {
          record: {
            name: true,
          },
        },
      });
      expect(result.record.id).toBe(user1.id);
      expect(result.record.name).toBe('abc');
      expect(result.record.gender).toBe(user1.gender);
    });

    it('should return mongoose document', async () => {
      const result = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: 'abc' },
        },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with founded `record`  and `resolveParams` as args', async () => {
      let beforeMutationId;
      const result = await updateOne(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: 'abc' },
        },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record: any, rp: ExtendedResolveParams) => {
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
        beforeRecordMutate: (record: any, rp: ExtendedResolveParams) => {
          if (rp.context.readOnly) {
            return Promise.reject(new Error('Denied due context ReadOnly'));
          }
          return record;
        },
      });
      await expect(result).rejects.toThrow('Denied due context ReadOnly');
      const exist = await UserModel.collection.findOne({ _id: user1._id });
      expect(exist.n).toBe(user1.name);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;

      const result = await updateOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id }, record: { name: 'new name' } },
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toHaveProperty('exec');
          expect(rp.model).toBe(UserModel);

          beforeQueryCalled = true;
          // modify query before execution
          return query.where({ _id: user2.id });
        },
      });

      expect(result).toHaveProperty('record._id', user2._id);
      expect(beforeQueryCalled).toBe(true);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType: any = updateOne(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`UpdateOne${UserTC.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      expect(updateOne(UserModel, UserTC).getOTC().getFieldTypeName('recordId')).toBe('MongoID');
    });

    it('should have record field', () => {
      const outputType: any = updateOne(UserModel, UserTC).getType();
      const recordField = schemaComposer.createObjectTC(outputType).getFieldConfig('record');
      expect(recordField.type).toBe(UserTC.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `UpdateOne${UserTC.getTypeName()}Payload`;
      const existedType = schemaComposer.createObjectTC(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = updateOne(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });

    it('should have all fields optional in filter', () => {
      const resolver = updateOne(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldTypeName('name')).toBe('String');
      expect(resolver.getArgITC('filter').getFieldTypeName('age')).toBe('Float');
      expect(resolver.getArgITC('record').getFieldTypeName('name')).toBe('String');
      expect(resolver.getArgITC('record').getFieldTypeName('age')).toBe('Float');
    });
  });
});
