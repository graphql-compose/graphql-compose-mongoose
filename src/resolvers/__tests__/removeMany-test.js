/* @flow */

import { expect } from 'chai';
import { GraphQLInt, GraphQLNonNull, GraphQLObjectType } from 'graphql';
import { Query } from 'mongoose';
import { Resolver, TypeComposer } from 'graphql-compose/';
import { UserModel } from '../../__mocks__/userModel';
import removeMany from '../removeMany';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('removeMany() ->', () => {
  let user1;
  let user2;
  let user3;

  beforeEach(() => {
    typeStorage.clear();
  });

  beforeEach('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
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
    const resolver = removeMany(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `filter` arg', () => {
      const resolver = removeMany(UserModel, UserTypeComposer);
      const filterField = resolver.getArg('filter');
      expect(filterField).to.be.ok;
      expect(filterField).property('type').instanceof(GraphQLNonNull);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeMany(UserModel, UserTypeComposer).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = removeMany(UserModel, UserTypeComposer).resolve({ args: {} });
      await expect(result).be.rejectedWith(Error, 'at least one value in args.filter');
    });

    it('should remove data in database', (done) => {
      removeMany(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user1._id }, (err, doc) => {
          expect(err).to.be.null;
          expect(doc).to.be.null;
          done();
        });
      });
    });

    it('should not remove unsuitable data to filter in database', (done) => {
      removeMany(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user2._id }, (err, doc) => {
          expect(err).to.be.null;
          expect(doc).to.be.ok;
          done();
        });
      });
    });

    it('should return payload.numAffected', async () => {
      const result = await removeMany(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { gender: 'female' },
        },
      });
      expect(result).have.property('numAffected', 2);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;
      const result = await removeMany(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { gender: 'female' },
        },
        beforeQuery: (query) => {
          expect(query).instanceof(Query);
          beforeQueryCalled = true;
          return query;
        }
      });
      expect(beforeQueryCalled).to.be.true;
      expect(result).have.property('numAffected', 2);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have correct output type name', () => {
      const outputType = removeMany(UserModel, UserTypeComposer).getType();
      expect(outputType).property('name')
        .to.equal(`RemoveMany${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType = removeMany(UserModel, UserTypeComposer).getType();
      const numAffectedField = new TypeComposer(outputType).getField('numAffected');
      expect(numAffectedField).property('type').to.equal(GraphQLInt);
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `RemoveMany${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = removeMany(UserModel, UserTypeComposer).getType();
      expect(outputType).to.equal(existedType);
    });
  });
});
