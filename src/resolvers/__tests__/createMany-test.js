/* @flow */
/* eslint-disable no-param-reassign,func-names */

import { Resolver, schemaComposer, TypeComposer } from 'graphql-compose';
import { GraphQLInt, GraphQLList, GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { UserModel } from '../../__mocks__/userModel';
import { convertModelToGraphQL } from '../../fieldsConverter';
import GraphQLMongoID from '../../types/mongoid';
import createMany from '../createMany';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('createMany() ->', () => {
  let UserTC;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    UserTC.setRecordIdFn(source => (source ? `${source._id}` : ''));
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
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should rejected with Error if args.records is not array', async () => {
      const result = createMany(UserModel, UserTC).resolve({ args: { records: {} } });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should rejected with Error if args.records is empty array', async () => {
      const result = createMany(UserModel, UserTC).resolve({
        args: { records: [] },
      });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should rejected with Error if args.records is array with empty items', async () => {
      const result = createMany(UserModel, UserTC).resolve({
        args: { records: [{ name: 'fails' }, {}] },
      });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should return payload.recordIds', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [{ name: 'newName' }],
        },
      });
      expect(result.recordIds).toBeTruthy();
    });

    it('should create documents with args.records and match createCount', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [{ name: 'newName0' }, { name: 'newName1' }],
        },
      });
      expect(result.createCount).toBe(2);
      expect(result.records[0].name).toBe('newName0');
      expect(result.records[1].name).toBe('newName1');
    });

    it('should save documents to database', async () => {
      const checkedName = 'nameForMongoDB';
      const res = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [{ name: checkedName }, { name: checkedName }],
        },
      });

      const docs = await UserModel.collection.find({ _id: { $in: res.recordIds } }).toArray();
      expect(docs.length).toBe(2);
      expect(docs[0].name).toBe(checkedName);
      expect(docs[1].name).toBe(checkedName);
    });

    it('should return payload.records', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: {
          records: [{ name: 'NewUser' }],
        },
      });
      expect(result.records[0]._id).toBe(result.recordIds[0]);
    });

    it('should return mongoose documents', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: { records: [{ name: 'NewUser' }] },
      });
      expect(result.records[0]).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with each created `record` and `resolveParams` as args', async () => {
      const result = await createMany(UserModel, UserTC).resolve({
        args: { records: [{ name: 'NewUser0' }, { name: 'NewUser1' }] },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record, rp) => {
          record.name = 'OverridedName';
          record.someDynamic = rp.context.ip;
          return record;
        },
      });
      expect(result.records[0]).toBeInstanceOf(UserModel);
      expect(result.records[1]).toBeInstanceOf(UserModel);
      expect(result.records[0].name).toBe('OverridedName');
      expect(result.records[1].name).toBe('OverridedName');
      expect(result.records[0].someDynamic).toBe('1.1.1.1');
      expect(result.records[1].someDynamic).toBe('1.1.1.1');
    });

    it('should execute hooks on save', async () => {
      schemaComposer.clear();
      const ClonedUserSchema = UserModel.schema.clone();

      ClonedUserSchema.pre('save', function(next) {
        this.name = 'ChangedAgain';
        this.age = 18;
        return next();
      });

      const ClonedUserModel = mongoose.model('UserClone', ClonedUserSchema);

      const ClonedUserTC = convertModelToGraphQL(ClonedUserModel, 'UserClone', schemaComposer);
      ClonedUserTC.setRecordIdFn(source => (source ? `${source._id}` : ''));

      const result = await createMany(ClonedUserModel, ClonedUserTC).resolve({
        args: { records: [{ name: 'NewUser0' }, { name: 'NewUser1' }] },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record, rp) => {
          record.name = 'OverridedName';
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
      const outputType: any = createMany(UserModel, UserTC).getType();
      expect(outputType.name).toBe(`CreateMany${UserTC.getTypeName()}Payload`);
    });

    it('should have recordIds field, NonNull List', () => {
      const outputType: any = createMany(UserModel, UserTC).getType();
      const recordIdField = new TypeComposer(outputType).getFieldConfig('recordIds');
      expect(recordIdField.type).toEqual(new GraphQLNonNull(GraphQLList(GraphQLMongoID)));
    });

    it('should have records field, NonNull List', () => {
      const outputType: any = createMany(UserModel, UserTC).getType();
      const recordField = new TypeComposer(outputType).getFieldConfig('records');
      expect(recordField.type).toEqual(new GraphQLNonNull(GraphQLList(UserTC.getType())));
    });

    it('should have createCount field, Int', () => {
      const outputType: any = createMany(UserModel, UserTC).getType();
      const recordField = new TypeComposer(outputType).getFieldConfig('createCount');
      expect(recordField.type).toEqual(new GraphQLNonNull(GraphQLInt));
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `CreateMany${UserTC.getTypeName()}Payload`;
      const existedType = TypeComposer.create(outputTypeName);
      schemaComposer.set(outputTypeName, existedType);
      const outputType = createMany(UserModel, UserTC).getType();
      expect(outputType).toBe(existedType.getType());
    });
  });
});
