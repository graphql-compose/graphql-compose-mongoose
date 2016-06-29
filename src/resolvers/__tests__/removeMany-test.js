/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import removeMany from '../removeMany';
import Resolver from '../../../../graphql-compose/src/resolver/resolver';
import TypeComposer from '../../../../graphql-compose/src/typeComposer';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { GraphQLInt, GraphQLNonNull } from 'graphql';

const UserType = convertModelToGraphQL(UserModel, 'User');

describe('removeMany() ->', () => {
  let user1;
  let user2;
  let user3;

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
    const resolver = removeMany(UserModel, UserType);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have required `filter` arg', () => {
      const resolver = removeMany(UserModel, UserType);
      const filterField = resolver.getArg('filter');
      expect(filterField).to.be.ok;
      expect(filterField).property('type').instanceof(GraphQLNonNull);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeMany(UserModel, UserType).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = removeMany(UserModel, UserType).resolve({ args: {} });
      await expect(result).be.rejectedWith(Error, 'at least one value in args.filter');
    });

    it('should remove data in database', (done) => {
      removeMany(UserModel, UserType).resolve({
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
      removeMany(UserModel, UserType).resolve({
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
      const result = await removeMany(UserModel, UserType).resolve({
        args: {
          filter: { gender: 'female' },
        },
      });
      expect(result).have.property('numAffected', 2);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = removeMany(UserModel, UserType).getOutputType();
      expect(outputType).property('name').to.equal(`RemoveMany${UserType.name}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType = removeMany(UserModel, UserType).getOutputType();
      const numAffectedField = new TypeComposer(outputType).getField('numAffected');
      expect(numAffectedField).property('type').to.equal(GraphQLInt);
    });
  });
});
