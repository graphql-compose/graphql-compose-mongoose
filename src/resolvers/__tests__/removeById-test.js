/* @flow */
/* eslint-disable no-param-reassign */

import { expect } from 'chai';
import { GraphQLNonNull, GraphQLObjectType } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import removeById from '../removeById';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('removeById() ->', () => {
  let user;

  beforeEach('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  beforeEach(() => {
    typeStorage.clear();
  });

  beforeEach('add test user document to mongoDB', () => {
    user = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
    });

    return Promise.all([
      user.save(),
    ]);
  });

  it('should return Resolver object', () => {
    const resolver = removeById(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_id` arg', () => {
      const resolver = removeById(UserModel, UserTypeComposer);
      expect(resolver.hasArg('_id')).to.be.true;
      const argConfig = resolver.getArg('_id');
      expect(argConfig).property('type').that.instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType').that.equal(GraphQLMongoID);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeById(UserModel, UserTypeComposer).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args._id is empty', async () => {
      const result = removeById(UserModel, UserTypeComposer).resolve({ args: { } });
      await expect(result).be.rejectedWith(Error, 'requires args._id');
    });

    it('should return payload.recordId', async () => {
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: user.id,
        },
      });
      expect(result).have.property('recordId', user.id);
    });

    it('should return error if document does not exist', () => {
      const unexistedId = '500000000000000000000000';
      const promise = removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: unexistedId,
        },
      });
      return expect(promise).to.eventually.be.rejectedWith('Document not found');
    });


    it('should remove document in database', (done) => {
      removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: user.id,
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user._id }, (err, doc) => {
          expect(err).to.be.null;
          expect(doc).to.be.null;
          done();
        });
      });
    });

    it('should return payload.record', async () => {
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: user.id,
        },
      });
      expect(result).have.deep.property('record.id', user.id);
    });

    it('should pass empty projection to findById and got full document data', async () => {
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: {
          _id: user.id,
        },
        projection: {
          record: {
            name: true,
          },
        },
      });
      expect(result).have.deep.property('record.id', user.id);
      expect(result).have.deep.property('record.name', user.name);
      expect(result).have.deep.property('record.gender', user.gender);
    });

    it('should return mongoose document', async () => {
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: { _id: user.id },
      });
      expect(result.record).instanceof(UserModel);
    });

    it('should call `beforeRecordMutate` method with founded `record` and `resolveParams` as args', async () => {
      let beforeMutationId;
      const result = await removeById(UserModel, UserTypeComposer).resolve({
        args: { _id: user.id },
        context: { ip: '1.1.1.1' },
        beforeRecordMutate: (record, rp) => {
          beforeMutationId = record.id;
          record.someDynamic = rp.context.ip;
          return record;
        },
      });
      expect(result.record).instanceof(UserModel);
      expect(result).have.deep.property('record.someDynamic', '1.1.1.1');
      expect(beforeMutationId).to.equal(user.id);

      const empty = await UserModel.collection.findOne({ _id: user._id });
      expect(empty).to.equal(null);
    });

    it('`beforeRecordMutate` may reject operation', async () => {
      const result = removeById(UserModel, UserTypeComposer).resolve({
        args: { _id: user.id },
        context: { readOnly: true },
        beforeRecordMutate: (record, rp) => {
          if (rp.context.readOnly) {
            return Promise.reject(new Error('Denied due context ReadOnly'));
          }
          return record;
        },
      });
      await expect(result).be.rejectedWith(Error, 'Denied due context ReadOnly');
      const exist = await UserModel.collection.findOne({ _id: user._id });
      expect(exist.name).to.equal(user.name);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType = removeById(UserModel, UserTypeComposer).getType();
      expect(outputType.name).to.equal(`RemoveById${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = removeById(UserModel, UserTypeComposer).getType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('recordId')).to.be.true;
      expect(typeComposer.getField('recordId').type).to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = removeById(UserModel, UserTypeComposer).getType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('record')).to.be.true;
      expect(typeComposer.getField('record').type).to.equal(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveById${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = removeById(UserModel, UserTypeComposer).getType();
      expect(outputType).to.equal(existedType);
    });
  });
});
