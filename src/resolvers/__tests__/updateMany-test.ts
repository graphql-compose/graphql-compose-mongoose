import { Query } from 'mongoose';
import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLInt, GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { updateMany } from '../updateMany';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('updateMany() ->', () => {
  let UserTC: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
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
    const resolver = updateMany(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` optional arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.getArgTypeName('filter')).toBe('FilterUpdateManyUserInput');
    });

    it('should have user.contacts.mail as optional field', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldITC('contacts').getFieldTypeName('email')).toBe(
        'String'
      );
    });

    it('should have `limit` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.hasArg('limit')).toBe(true);
    });

    it('should have `skip` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.hasArg('skip')).toBe(true);
    });

    it('should have `sort` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.hasArg('sort')).toBe(true);
    });

    it('should have `record` arg', () => {
      const resolver = updateMany(UserModel, UserTC);
      const argConfig: any = resolver.getArgConfig('record');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType.name).toBe('UpdateManyUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateMany(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.record is empty', async () => {
      const result = updateMany(UserModel, UserTC).resolve({ args: {} });
      await expect(result).rejects.toThrow(
        'User.updateMany resolver requires at least one value in args.record'
      );
    });

    it('should change data via args.record in database', async () => {
      const checkedName = 'nameForMongoDB';
      await updateMany(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: checkedName },
        },
      });

      await expect(UserModel.findOne({ _id: user1._id })).resolves.toEqual(
        expect.objectContaining({ n: checkedName })
      );
    });

    it('should return payload.numAffected', async () => {
      const result = await updateMany(UserModel, UserTC).resolve({
        args: {
          record: { gender: 'female' },
        },
      });
      expect(result.numAffected).toBe(2);
    });

    it('should return resolver runtime error in payload.error', async () => {
      const resolver = updateMany(UserModel, UserTC);
      await expect(resolver.resolve({ projection: { error: true } })).resolves.toEqual({
        error: expect.objectContaining({
          message: expect.stringContaining('at least one value in args.record'),
        }),
      });

      // should throw error if error not requested in graphql query
      await expect(resolver.resolve({})).rejects.toThrowError('at least one value in args.record');
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;
      const result = await updateMany(UserModel, UserTC).resolve({
        args: {
          record: { gender: 'female' },
        },
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toBeInstanceOf(Query);
          expect(rp.model).toBe(UserModel);
          beforeQueryCalled = true;
          // modify query before execution
          return query.where({ _id: user1.id });
        },
      });
      expect(beforeQueryCalled).toBe(true);
      expect(result.numAffected).toBe(1);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType: any = updateMany(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`UpdateMany${UserTC.getTypeName()}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType: any = updateMany(UserModel, UserTC).getType();
      const numAffectedField = schemaComposer
        .createObjectTC(outputType)
        .getFieldConfig('numAffected');
      expect(numAffectedField.type).toBe(GraphQLInt);
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `UpdateMany${UserTC.getTypeName()}Payload`;
      const existedType = schemaComposer.createObjectTC(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = updateMany(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });

    it('should have all fields optional in filter', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldTypeName('name')).toBe('String');
      expect(resolver.getArgITC('filter').getFieldTypeName('age')).toBe('Float');
    });

    it('should have all fields optional in record', () => {
      const resolver = updateMany(UserModel, UserTC);
      expect(resolver.getArgITC('record').getFieldTypeName('name')).toBe('String');
      expect(resolver.getArgITC('record').getFieldTypeName('age')).toBe('Float');
    });
  });
});
