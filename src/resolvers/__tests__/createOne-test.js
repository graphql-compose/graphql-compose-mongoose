/* @flow */

import { expect } from 'chai';
import { GraphQLNonNull } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel.js';
import createOne from '../createOne';
import { composeWithMongoose } from '../../composeWithMongoose';
import GraphQLMongoID from '../../types/mongoid';
import typeStorage from '../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('createOne() ->', () => {
  before('clear UserModel collection', (done) => {
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
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = createOne(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).property('name')
        .to.equal(`CreateOne${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = createOne(UserModel, UserTypeComposer).getOutputType();
      const recordIdField = new TypeComposer(outputType).getField('recordId');
      expect(recordIdField).property('type').to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = createOne(UserModel, UserTypeComposer).getOutputType();
      const recordField = new TypeComposer(outputType).getField('record');
      expect(recordField).property('type').to.equal(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `CreateOne${UserTypeComposer.getTypeName()}Payload`;
      typeStorage.set(outputTypeName, 'EXISTED_TYPE');
      const outputType = createOne(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).to.equal('EXISTED_TYPE');
    });
  });
});
