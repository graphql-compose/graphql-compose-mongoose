/* @flow */
/* eslint-disable no-param-reassign */

import { expect } from 'chai';
import { GraphQLNonNull, GraphQLObjectType } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import createOne from '../createOne';
import { composeWithMongoose } from '../../composeWithMongoose';
import GraphQLMongoID from '../../types/mongoid';
import typeStorage from '../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('createOne() ->', () => {
  beforeEach('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  beforeEach(() => {
    typeStorage.clear();
  });

  it('should return Resolver object', () => {
    const resolver = createOne(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `record` arg', () => {
      const resolver = createOne(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('record');
      expect(argConfig).property('type').instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType.name', 'CreateOneUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = createOne(UserModel, UserTypeComposer).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.record is empty', async () => {
      const result = createOne(UserModel, UserTypeComposer).resolve({ args: {} });
      await expect(result).be.rejectedWith(Error, 'at least one value in args.record');
    });

    it('should return payload.recordId', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: {
          record: { name: 'newName' },
        },
      });
      expect(result).property('recordId').to.be.ok;
    });

    it('should create document with args.record', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: {
          record: { name: 'newName' },
        },
      });
      expect(result).have.deep.property('record.name', 'newName');
    });

    it('should save document to database', (done) => {
      const checkedName = 'nameForMongoDB';
      createOne(UserModel, UserTypeComposer).resolve({
        args: {
          record: { name: checkedName },
        },
      }).then((res) => {
        UserModel.collection.findOne({ _id: res.record._id }, (err, doc) => {
          expect(doc.name).to.be.equal(checkedName);
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
      expect(result).have.deep.property('record.id', result.recordId);
    });

    it('should return mongoose document', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: { record: { name: 'NewUser' } },
      });
      expect(result).property('record').instanceof(UserModel);
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
      expect(result).property('record').instanceof(UserModel);
      expect(result).have.deep.property('record.name', 'OverridedName');
      expect(result).have.deep.property('record.someDynamic', '1.1.1.1');
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType = createOne(UserModel, UserTypeComposer).getType();
      expect(outputType).property('name')
        .to.equal(`CreateOne${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = createOne(UserModel, UserTypeComposer).getType();
      const recordIdField = new TypeComposer(outputType).getField('recordId');
      expect(recordIdField).property('type').to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = createOne(UserModel, UserTypeComposer).getType();
      const recordField = new TypeComposer(outputType).getField('record');
      expect(recordField).property('type').to.equal(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `CreateOne${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = createOne(UserModel, UserTypeComposer).getType();
      expect(outputType).to.equal(existedType);
    });
  });
});
