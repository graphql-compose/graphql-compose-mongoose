/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer, graphql } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import createOne from '../createOne';
import { composeWithMongoose } from '../../composeWithMongoose';
import GraphQLMongoID from '../../types/mongoid';
import typeStorage from '../../typeStorage';

const { GraphQLNonNull, GraphQLObjectType } = graphql;

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('createOne() ->', () => {
  let UserTypeComposer;

  beforeEach(() => {
    typeStorage.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTypeComposer = composeWithMongoose(UserModel);
  });

  beforeEach(async () => {
    await UserModel.remove({});
  });

  it('should return Resolver object', () => {
    const resolver = createOne(UserModel, UserTypeComposer);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `record` arg', () => {
      const resolver = createOne(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('record');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      // $FlowFixMe
      expect(argConfig.type.ofType.name).toBe('CreateOneUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = createOne(UserModel, UserTypeComposer).resolve({});
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.record is empty', async () => {
      const result = createOne(UserModel, UserTypeComposer).resolve({ args: {} });
      await expect(result).rejects.toMatchSnapshot();
    });

    it('should return payload.recordId', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: {
          record: { name: 'newName' },
        },
      });
      expect(result.recordId).toBeTruthy();
    });

    it('should create document with args.record', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: {
          record: { name: 'newName' },
        },
      });
      expect(result.record.name).toBe('newName');
    });

    it('should save document to database', done => {
      const checkedName = 'nameForMongoDB';
      createOne(UserModel, UserTypeComposer)
        .resolve({
          args: {
            record: { name: checkedName },
          },
        })
        .then(res => {
          UserModel.collection.findOne({ _id: res.record._id }, (err, doc) => {
            expect(doc.name).toBe(checkedName);
            done();
          });
        });
    });

    it('should return payload.record', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: {
          record: { name: 'NewUser' },
        },
      });
      expect(result.record.id).toBe(result.recordId);
    });

    it('should return mongoose document', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: { record: { name: 'NewUser' } },
      });
      expect(result.record).toBeInstanceOf(UserModel);
    });

    it('should call `beforeRecordMutate` method with created `record` and `resolveParams` as args', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
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
      const outputType = createOne(UserModel, UserTypeComposer).getType();
      // $FlowFixMe
      expect(outputType.name).toBe(`CreateOne${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = createOne(UserModel, UserTypeComposer).getType();
      // $FlowFixMe
      const recordIdField = new TypeComposer(outputType).getField('recordId');
      expect(recordIdField.type).toBe(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = createOne(UserModel, UserTypeComposer).getType();
      // $FlowFixMe
      const recordField = new TypeComposer(outputType).getField('record');
      expect(recordField.type).toBe(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `CreateOne${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = createOne(UserModel, UserTypeComposer).getType();
      expect(outputType).toBe(existedType);
    });
  });
});
