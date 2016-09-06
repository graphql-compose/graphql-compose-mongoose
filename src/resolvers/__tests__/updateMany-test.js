/* @flow */

import { expect } from 'chai';
import { GraphQLInt, GraphQLNonNull } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel.js';
import updateMany from '../updateMany';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);


describe('updateMany() ->', () => {
  let user1;
  let user2;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  before('add test user document to mongoDB', () => {
    user1 = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
    });

    user2 = new UserModel({
      name: 'userName2',
      skills: ['go', 'erlang'],
      gender: 'female',
      relocation: true,
    });

    return Promise.all([
      user1.save(),
      user2.save(),
    ]);
  });

  beforeEach(() => {
    typeStorage.clear();
  });

  it('should return Resolver object', () => {
    const resolver = updateMany(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = updateMany(UserModel, UserTypeComposer);
      expect(resolver.hasArg('filter')).to.be.true;
    });

    it('should have `limit` arg', () => {
      const resolver = updateMany(UserModel, UserTypeComposer);
      expect(resolver.hasArg('limit')).to.be.true;
    });

    it('should have `skip` arg', () => {
      const resolver = updateMany(UserModel, UserTypeComposer);
      expect(resolver.hasArg('skip')).to.be.true;
    });

    it('should have `sort` arg', () => {
      const resolver = updateMany(UserModel, UserTypeComposer);
      expect(resolver.hasArg('sort')).to.be.true;
    });

    it('should have `record` arg', () => {
      const resolver = updateMany(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('record');
      expect(argConfig).property('type').instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType.name', 'UpdateManyUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateMany(UserModel, UserTypeComposer).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.record is empty', async () => {
      const result = updateMany(UserModel, UserTypeComposer).resolve({ args: {} });
      await expect(result).be.rejectedWith(Error, 'at least one value in args.record');
    });

    it('should change data via args.record in database', (done) => {
      const checkedName = 'nameForMongoDB';
      updateMany(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: checkedName },
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user1._id }, (err, doc) => {
          expect(doc).property('name').to.be.equal(checkedName);
          done();
        });
      });
    });

    it('should return payload.numAffected', async () => {
      const result = await updateMany(UserModel, UserTypeComposer).resolve({
        args: {
          record: { gender: 'female' },
        },
      });
      expect(result).have.deep.property('numAffected', 2);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = updateMany(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).property('name')
        .to.equal(`UpdateMany${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType = updateMany(UserModel, UserTypeComposer).getOutputType();
      const numAffectedField = new TypeComposer(outputType).getField('numAffected');
      expect(numAffectedField).property('type').to.equal(GraphQLInt);
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `UpdateMany${UserTypeComposer.getTypeName()}Payload`;
      typeStorage.set(outputTypeName, 'EXISTED_TYPE');
      const outputType = updateMany(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).to.equal('EXISTED_TYPE');
    });
  });
});
