/* @flow */

import { expect } from 'chai';
import { GraphQLObjectType } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { Query } from 'mongoose';
import { UserModel } from '../../__mocks__/userModel';
import removeOne from '../removeOne';
import GraphQLMongoID from '../../types/mongoid';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('removeOne() ->', () => {
  let user1;
  let user2;
  let user3;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  beforeEach(() => {
    typeStorage.clear();
  });

  beforeEach('add test user document to mongoDB', () => {
    user1 = new UserModel({
      name: 'userName1',
      gender: 'male',
      relocation: true,
      age: 28,
    });

    user2 = new UserModel({
      name: 'userName2',
      gender: 'female',
      relocation: true,
      age: 29,
    });

    user3 = new UserModel({
      name: 'userName3',
      gender: 'female',
      relocation: true,
      age: 30,
    });

    return Promise.all([
      user1.save(),
      user2.save(),
      user3.save(),
    ]);
  });

  it('should return Resolver object', () => {
    const resolver = removeOne(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = removeOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('filter')).to.be.true;
    });

    it('should not have `skip` arg due mongoose error: '
     + 'skip cannot be used with findOneAndRemove', () => {
      const resolver = removeOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('skip')).to.be.false;
    });

    it('should have `sort` arg', () => {
      const resolver = removeOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('sort')).to.be.true;
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      // some crazy shit for method `MongooseModel.findOneAndRemove`
      // needs to set explicitly Promise object
      // otherwise it returns Promise object, but it not instanse of global Promise
      mongoose.Promise = Promise; // eslint-disable-line
      const result = removeOne(UserModel, UserTypeComposer).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appears, hide it from mocha');
    });

    it('should return payload.recordId if record existed in db', async () => {
      const result = await removeOne(UserModel, UserTypeComposer).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result).have.property('recordId', user1.id);
    });

    it('should remove document in database', (done) => {
      const checkedName = 'nameForMongoDB';
      removeOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
          input: { name: checkedName },
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user1._id }, (err, doc) => {
          expect(err).to.be.null;
          expect(doc).to.be.null;
          done();
        });
      });
    });

    it('should return payload.record', async () => {
      const result = await removeOne(UserModel, UserTypeComposer).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result).have.deep.property('record.id', user1.id);
    });

    it('should sort records', async () => {
      const result1 = await removeOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { relocation: true },
          sort: { age: 1 },
        },
      });
      expect(result1).have.deep.property('record.age', user1.age);

      const result2 = await removeOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { relocation: true },
          sort: { age: -1 },
        },
      });
      expect(result2).have.deep.property('record.age', user3.age);
    });

    it('should return mongoose document', async () => {
      const result = await removeOne(UserModel, UserTypeComposer).resolve({
        args: { },
      });
      expect(result.record).instanceof(UserModel);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;
      const result = await removeOne(UserModel, UserTypeComposer).resolve({
        args: { },
        beforeQuery: (query) => {
          expect(query).instanceof(Query);
          beforeQueryCalled = true;
          return query;
        }
      });
      expect(beforeQueryCalled).to.be.true;
      expect(result.record).instanceof(UserModel);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = removeOne(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).property('name')
        .to.equal(`RemoveOne${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = removeOne(UserModel, UserTypeComposer).getOutputType();
      const recordIdField = new TypeComposer(outputType).getField('recordId');
      expect(recordIdField).property('type').to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = removeOne(UserModel, UserTypeComposer).getOutputType();
      const recordField = new TypeComposer(outputType).getField('record');
      expect(recordField).property('type').to.equal(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveOne${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = removeOne(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).to.equal(existedType);
    });
  });
});
