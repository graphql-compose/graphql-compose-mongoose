/* eslint-disable no-param-reassign,func-names */

import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLInt, GraphQLList, GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { convertModelToGraphQL } from '../../fieldsConverter';
import createMany from '../createMany';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('createMany() ->', () => {
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
    const resolver = createMany(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `records` arg', () => {
      const resolver = createMany(UserModel, UserTC);
      const argConfig: any = resolver.getArgConfig('records');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.toString()).toBe('[CreateManyUserInput!]!');
    });
    it('should have `records` arg as Plural', () => {
      const resolver = createMany(UserModel, UserTC);
      const argConfig: any = resolver.getArgConfig('records');
      expect(argConfig.type.ofType).toBeInstanceOf(GraphQLList);
      expect(argConfig.type.ofType.toString()).toBe('[CreateManyUserInput!]');
    });
    it('should have `records` arg internal item as required', () => {
      const resolver = createMany(UserModel, UserTC);
      const argConfig: any = resolver.getArgConfig('records');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType.ofType.toString()).toBe('CreateManyUserInput!');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = createMany(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.records is empty', async () => {
      const result = createMany(UserModel, UserTC).resolve({ args: {} });
      await expect(result).rejects.toThrow(
        'User.createMany resolver requires args.records to be an Array and must contain at least one record'
      );
    });

    it('should rejected with Error if args.records is not array', async () => {
      const result = createMany(UserModel, UserTC).resolve({ args: { records: {} } });
      await expect(result).rejects.toThrow(
        'ser.createMany resolver requires args.records to be an Array and must contain at least one record'
      );
    });

    it('should rejected with Error if args.records is empty array', async () => {
      const result = createMany(UserModel, UserTC).resolve({
        args: { records: [] },
      });
      await expect(result).rejects.toThrow(
        'User.createMany resolver requires args.records to be an Array and must contain at least one record'
      );
    });

    it('should rejected with Error if args.records is array with empty items', async () => {
      const result = createMany(UserModel, UserTC).resolve({
        args: { records: [{ name: 'fails' }, {}] },
      });
      await expect(result).rejects.toThrow(
        'User.createMany resolver requires args.records to contain non-empty records, with at least one value'
      );
    });

    it('should return payload.recordIds', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [{ name: 'newName', contacts: { email: 'mail' } }],
        },
        projection: { error: true },
      });
      expect(result.recordIds).toBeTruthy();
    });

    it('should create documents with args.records and match createCount', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [
            { name: 'newName0', contacts: { email: 'mail' } },
            { name: 'newName1', contacts: { email: 'mail' } },
          ],
        },
        projection: { error: true },
      });
      expect(result.createCount).toBe(2);
      expect(result.records[0].name).toBe('newName0');
      expect(result.records[1].name).toBe('newName1');
    });

    it('should return resolver runtime error in payload.error', async () => {
      const resolver = createMany(UserModel, UserTC);
      await expect(resolver.resolve({ projection: { error: true } })).resolves.toEqual({
        error: expect.objectContaining({
          message: expect.stringContaining('requires args.records to be an Array'),
        }),
      });

      // should throw error if error not requested in graphql query
      await expect(resolver.resolve({})).rejects.toThrowError(
        'requires args.records to be an Array'
      );
    });

    it('should save documents to database', async () => {
      const checkedName = 'nameForMongoDB';
      const res = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [
            { name: checkedName, contacts: { email: 'mail' } },
            { name: checkedName, contacts: { email: 'mail' } },
          ],
        },
        projection: { error: true },
      });

      const docs = await UserModel.collection.find({ _id: { $in: res.recordIds } }).toArray();
      expect(docs.length).toBe(2);
      expect(docs[0].n).toBe(checkedName);
      expect(docs[1].n).toBe(checkedName);
    });

    it('should return payload.records', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [{ name: 'NewUser', contacts: { email: 'mail' } }],
        },
        projection: { error: true },
      });
      expect(result.records[0]._id).toBe(result.recordIds[0]);
    });

    it('should return mongoose documents', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: { records: [{ name: 'NewUser', contacts: { email: 'mail' } }] },
        projection: { error: true },
      });
      expect(result.records[0]).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with each created `record` and `resolveParams` as args', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [
            { name: 'NewUser0', contacts: { email: 'mail' } },
            { name: 'NewUser1', contacts: { email: 'mail' } },
          ],
        },
        projection: { error: true },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record: any, rp: ExtendedResolveParams) => {
          record.name = 'OverriddenName';
          record.someDynamic = rp.context.ip;
          return record;
        },
      });
      expect(result.records[0]).toBeInstanceOf(UserModel);
      expect(result.records[1]).toBeInstanceOf(UserModel);
      expect(result.records[0].name).toBe('OverriddenName');
      expect(result.records[1].name).toBe('OverriddenName');
      expect(result.records[0].someDynamic).toBe('1.1.1.1');
      expect(result.records[1].someDynamic).toBe('1.1.1.1');
    });

    it('should execute hooks on save', async () => {
      schemaComposer.clear();
      const ClonedUserSchema = UserModel.schema.clone();

      ClonedUserSchema.pre<IUser>('save', function (next) {
        this.name = 'ChangedAgain';
        this.age = 18;
        return next();
      });

      const ClonedUserModel = mongoose.model('UserClone', ClonedUserSchema);

      const ClonedUserTC = convertModelToGraphQL(ClonedUserModel, 'UserClone', schemaComposer);
      ClonedUserTC.setRecordIdFn((source: any) => (source ? `${source._id}` : ''));

      const result = await createMany(ClonedUserModel, ClonedUserTC).resolve({
        args: {
          records: [
            { name: 'NewUser0', contacts: { email: 'mail' } },
            { name: 'NewUser1', contacts: { email: 'mail' } },
          ],
        },
        projection: { error: true },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record: any, rp: ExtendedResolveParams) => {
          record.name = 'OverriddenName';
          record.someDynamic = rp.context.ip;
          return record;
        },
      });
      expect(result.records[0]).toBeInstanceOf(ClonedUserModel);
      expect(result.records[1]).toBeInstanceOf(ClonedUserModel);
      expect(result.records[0].age).toBe(18);
      expect(result.records[1].age).toBe(18);
      expect(result.records[0].name).toBe('ChangedAgain');
      expect(result.records[1].name).toBe('ChangedAgain');
      expect(result.records[0].someDynamic).toBe('1.1.1.1');
      expect(result.records[1].someDynamic).toBe('1.1.1.1');
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const resolver: any = createMany(UserModel, UserTC);
      expect(resolver.getTypeName()).toBe(`CreateMany${UserTC.getTypeName()}Payload`);
      expect(resolver.getArgITC('records').getFieldTypeName('name')).toBe('String!');
      expect(resolver.getArgITC('records').getFieldTypeName('age')).toBe('Float');
    });

    it('should have recordIds field, NonNull List', () => {
      const resolver = createMany(UserModel, UserTC);
      expect(resolver.getOTC().getFieldTypeName('recordIds')).toEqual('[MongoID!]!');
    });

    it('should have records field, NonNull List', () => {
      const resolver = createMany(UserModel, UserTC);
      expect(resolver.getOTC().getFieldTypeName('records')).toEqual('[User!]');
    });

    it('should have user.contacts.mail required field', () => {
      const resolver = createMany(UserModel, UserTC);
      expect(resolver.getArgITC('records').getFieldITC('contacts').getFieldTypeName('email')).toBe(
        'String!'
      );
    });

    it('should have createCount field, Int', () => {
      const outputType: any = createMany(UserModel, UserTC).getType();
      const recordField = schemaComposer.createObjectTC(outputType).getFieldConfig('createCount');
      expect(recordField.type).toEqual(new GraphQLNonNull(GraphQLInt));
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `CreateMany${UserTC.getTypeName()}Payload`;
      const existedType = schemaComposer.createObjectTC(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = createMany(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });
  });
});
