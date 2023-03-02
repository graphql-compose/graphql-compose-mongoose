/* eslint-disable no-param-reassign */

import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { removeById } from '../removeById';
import GraphQLMongoID from '../../types/MongoID';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';
import { testFieldConfig } from '../../utils/testHelpers';
import { version } from 'mongoose';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('removeById() ->', () => {
  let UserTC: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    UserTC.setRecordIdFn((source) => (source ? `${source._id}` : ''));
  });

  let user: IUser;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
      contacts: { email: 'mail' },
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
      const result = removeById(UserModel, UserTC).resolve({
        // @ts-expect-error
        args: {},
      });
      await expect(result).rejects.toThrow('User.removeById resolver requires args._id value');
    });

    it('should return payload.recordId when it requested', async () => {
      const result = await testFieldConfig({
        field: removeById(UserModel, UserTC),
        args: { _id: user.id },
        selection: `{
          recordId
        }`,
      });
      expect(result.recordId).toBe(user.id);
    });

    it('should return resolver runtime error in payload.error', async () => {
      const resolver = removeById(UserModel, UserTC);
      await expect(resolver.resolve({ projection: { error: true } })).resolves.toEqual({
        error: expect.objectContaining({
          message: expect.stringContaining('resolver requires args._id'),
        }),
      });

      // should throw error if error not requested in graphql query
      await expect(resolver.resolve({})).rejects.toThrowError('resolver requires args._id');
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
        beforeRecordMutate: (record: any, rp: ExtendedResolveParams) => {
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
        beforeRecordMutate: (record: any, rp: ExtendedResolveParams) => {
          if (rp.context.readOnly) {
            return Promise.reject(new Error('Denied due context ReadOnly'));
          }
          return record;
        },
      });
      await expect(result).rejects.toThrow('Denied due context ReadOnly');
      const exist = await UserModel.collection.findOne({ _id: user._id });
      expect(exist?.n).toBe(user.name);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const mongooseActions: any[] = [];

      UserModel.base.set('debug', function debugMongoose(...args: any) {
        mongooseActions.push(args);
      });

      const resolveParams = {
        args: { _id: 'INVALID_ID' },
        context: { ip: '1.1.1.1' },
        beforeQuery(query: any, rp: ExtendedResolveParams) {
          expect(rp.model).toBe(UserModel);
          expect(rp.query).toHaveProperty('exec');
          return query.where({ _id: user._id, gender: 'some' });
        },
      };

      const result = await removeById(UserModel, UserTC).resolve(resolveParams);

      expect(mongooseActions).toEqual([
        [
          'users',
          'findOne',
          { _id: user._id, gender: 'some' },
          version.startsWith('7') ? undefined : { projection: {} },
        ].filter(Boolean),
      ]);

      expect(result).toBeNull();
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
