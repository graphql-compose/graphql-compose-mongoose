/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import createOne from '../createOne';
import { Resolver, TypeComposer } from 'graphql-compose';
import { mongooseModelToTypeComposer } from '../../modelConverter';
import GraphQLMongoID from '../../types/mongoid';
import { GraphQLNonNull } from 'graphql';

const UserTypeComposer = mongooseModelToTypeComposer(UserModel);

describe('createOne() ->', () => {
  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  it('should return Resolver object', () => {
    const resolver = createOne(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `input` arg', () => {
      const resolver = createOne(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('input');
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

    it('should rejected with Error if args.input is empty', async () => {
      const result = createOne(UserModel, UserTypeComposer).resolve({ args: {} });
      await expect(result).be.rejectedWith(Error, 'at least one value in args.input');
    });

    it('should return payload.recordId', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: {
          input: { name: 'newName' },
        },
      });
      expect(result).property('recordId').to.be.ok;
    });

    it('should create document with args.input', async () => {
      const result = await createOne(UserModel, UserTypeComposer).resolve({
        args: {
          input: { name: 'newName' },
        },
      });
      expect(result).have.deep.property('record.name', 'newName');
    });

    it('should save document to database', (done) => {
      const checkedName = 'nameForMongoDB';
      createOne(UserModel, UserTypeComposer).resolve({
        args: {
          input: { name: checkedName },
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
          input: { name: 'NewUser' },
        },
      });
      expect(result).have.deep.property('record.id', result.recordId);
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
  });
});
