import { Query } from 'mongoose';
import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLInt } from 'graphql-compose/lib/graphql';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { removeMany } from '../removeMany';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('removeMany() ->', () => {
  let UserTC: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer) as ObjectTypeComposer;
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
    const resolver = removeMany(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` required arg', () => {
      const resolver = removeMany(UserModel, UserTC);
      expect(resolver.getArgTypeName('filter')).toBe('FilterRemoveManyUserInput!');
    });

    it('should have user.contacts.mail as optional field', () => {
      const resolver = removeMany(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldITC('contacts').getFieldTypeName('email')).toBe(
        'String'
      );
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeMany(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = removeMany(UserModel, UserTC).resolve({
        // @ts-expect-error
        args: {},
      });
      await expect(result).rejects.toThrow(
        'User.removeMany resolver requires at least one value in args.filter'
      );
    });

    it('should remove data in database', async () => {
      await removeMany(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
        },
      });

      await expect(UserModel.findOne({ _id: user1._id })).resolves.toBeNull();
    });

    it('should not remove unsuitable data to filter in database', async () => {
      await removeMany(UserModel, UserTC).resolve({
        args: {
          filter: { _id: user1.id },
        },
      });
      await expect(UserModel.findOne({ _id: user2._id })).resolves.toBeDefined();
    });

    it('should return payload.numAffected', async () => {
      const result = await removeMany(UserModel, UserTC).resolve({
        args: {
          filter: { gender: 'female' },
        },
      });
      expect(result.numAffected).toBe(2);
    });

    it('should return resolver runtime error in payload.error', async () => {
      const resolver = removeMany(UserModel, UserTC);
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

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;
      const result = await removeMany(UserModel, UserTC).resolve({
        args: {
          filter: { gender: 'female' },
        },
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toBeInstanceOf(Query);
          expect(rp.model).toBe(UserModel);
          beforeQueryCalled = true;
          return query;
        },
      });
      expect(beforeQueryCalled).toBe(true);
      expect(result.numAffected).toBe(2);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType: any = removeMany(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`RemoveMany${UserTC.getTypeName()}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType: any = removeMany(UserModel, UserTC).getType();
      const numAffectedField = schemaComposer
        .createObjectTC(outputType)
        .getFieldConfig('numAffected');
      expect(numAffectedField.type).toBe(GraphQLInt);
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveMany${UserTC.getTypeName()}Payload`;
      const existedType = schemaComposer.createObjectTC('outputTypeName');
      schemaComposer.set(outputTypeName, existedType);
      const outputType = removeMany(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });

    it('should have all fields optional in filter', () => {
      const resolver = removeMany(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldTypeName('name')).toBe('String');
      expect(resolver.getArgITC('filter').getFieldTypeName('age')).toBe('Float');
    });
  });
});
