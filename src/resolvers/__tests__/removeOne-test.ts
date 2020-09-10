/* eslint-disable no-param-reassign */

import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { removeOne } from '../removeOne';
import GraphQLMongoID from '../../types/MongoID';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';
import { testFieldConfig } from '../../utils/testHelpers';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('removeOne() ->', () => {
  let UserTC: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    UserTC.setRecordIdFn((source) => (source ? `${source._id}` : ''));
  });

  let user1: IUser;
  let user2: IUser;
  let user3: IUser;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user1 = new UserModel({
      name: 'userName1',
      gender: 'male',
      relocation: true,
      age: 28,
      contacts: { email: 'mail' },
    });

    user2 = new UserModel({
      name: 'userName2',
      gender: 'female',
      relocation: true,
      age: 29,
      contacts: { email: 'mail' },
    });

    user3 = new UserModel({
      name: 'userName3',
      gender: 'female',
      relocation: true,
      age: 30,
      contacts: { email: 'mail' },
    });

    await Promise.all([user1.save(), user2.save(), user3.save()]);
  });

  it('should return Resolver object', () => {
    const resolver = removeOne(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` optional arg', () => {
      const resolver = removeOne(UserModel, UserTC);
      expect(resolver.getArgTypeName('filter')).toBe('FilterRemoveOneUserInput');
    });

    it('should have user.contacts.mail as optional field', () => {
      const resolver = removeOne(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldITC('contacts').getFieldTypeName('email')).toBe(
        'String'
      );
    });

    it(
      'should not have `skip` arg due mongoose error: ' +
        'skip cannot be used with findOneAndRemove',
      () => {
        const resolver = removeOne(UserModel, UserTC);
        expect(resolver.hasArg('skip')).toBe(false);
      }
    );

    it('should have `sort` arg', () => {
      const resolver = removeOne(UserModel, UserTC);
      expect(resolver.hasArg('sort')).toBe(true);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeOne(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appears, hide it from mocha');
    });

    it('should return payload.recordId if record existed in db', async () => {
      const result = await testFieldConfig({
        field: removeOne(UserModel, UserTC),
        args: { filter: { _id: user1.id } },
        selection: `{
          recordId
        }`,
      });
      expect(result.recordId).toBe(user1.id);
    });

    it('should return resolver runtime error in payload.error', async () => {
      const resolver = removeOne(UserModel, UserTC);
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

    it('should remove document in database', async () => {
      const checkedName = 'nameForMongoDB';
      await removeOne(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          input: { name: checkedName },
        },
      });

      await expect(UserModel.findOne({ _id: user1._id })).resolves.toBeNull();
    });

    it('should return payload.record', async () => {
      const result = await removeOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result.record.id).toBe(user1.id);
    });

    it('should sort records', async () => {
      const result1 = await removeOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          sort: { age: 1 },
        },
      });
      expect(result1.record.age).toBe(user1.age);

      const result2 = await removeOne(UserModel, UserTC).resolve({
        args: {
          filter: { relocation: true },
          sort: { age: -1 },
        },
      });
      expect(result2.record.age).toBe(user3.age);
    });

    it('should pass empty projection to findOne and got full document data', async () => {
      const result = await removeOne(UserModel, UserTC).resolve({
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
      const result = await removeOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = removeOne(UserModel, UserTC).resolve({ args: {} });
      await expect(result).rejects.toThrow(
        'User.removeOne resolver requires at least one value in args.filter'
      );
    });

    it('should call `beforeRecordMutate` method with founded `record` and `resolveParams` as args', async () => {
      let beforeMutationId;
      const result = await removeOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id } },
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

      const empty = await UserModel.collection.findOne({ _id: user1._id });
      expect(empty).toBe(null);
    });

    it('`beforeRecordMutate` may reject operation', async () => {
      const result = removeOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1.id } },
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

      const result = await removeOne(UserModel, UserTC).resolve({
        args: { filter: { _id: 'INVALID_ID' } },
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toHaveProperty('exec');
          expect(rp.model).toBe(UserModel);

          beforeQueryCalled = true;
          // modify query before execution
          return query.where({ _id: user1.id });
        },
      });

      expect(result).toHaveProperty('record._id', user1._id);
      expect(beforeQueryCalled).toBe(true);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType: any = removeOne(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`RemoveOne${UserTC.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType: any = removeOne(UserModel, UserTC).getType();
      const recordIdField = schemaComposer.createObjectTC(outputType).getFieldConfig('recordId');
      expect(recordIdField.type).toBe(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType: any = removeOne(UserModel, UserTC).getType();
      const recordField = schemaComposer.createObjectTC(outputType).getFieldConfig('record');
      expect(recordField.type).toBe(UserTC.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveOne${UserTC.getTypeName()}Payload`;
      const existedType = schemaComposer.createObjectTC(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = removeOne(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });

    it('should have all fields optional in filter', () => {
      const resolver = removeOne(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldTypeName('name')).toBe('String');
      expect(resolver.getArgITC('filter').getFieldTypeName('age')).toBe('Float');
    });
  });
});
