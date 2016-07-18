/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import findById from '../findById';
import { Resolver } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('findById() ->', () => {
  let user;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  before('add test user document to mongoDB', (done) => {
    user = new UserModel({ name: 'nodkz' });
    user.save(done);
  });

  it('should return Resolver object', () => {
    const resolver = findById(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_id` arg', () => {
      const resolver = findById(UserModel, UserTypeComposer);
      expect(resolver.hasArg('_id')).to.be.true;
      const argConfig = resolver.getArg('_id');
      expect(argConfig).property('type').that.instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType').that.equal(GraphQLMongoID);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findById(UserModel, UserTypeComposer).resolve({});
      await expect(result).be.fulfilled;
    });

    it('should be rejected if args.id is not objectId', async () => {
      const result = findById(UserModel, UserTypeComposer).resolve({ args: { _id: 1 } });
      await expect(result).be.rejected;
    });

    it('should return null if args.id is empty', async () => {
      const result = await findById(UserModel, UserTypeComposer).resolve({});
      expect(result).equal(null);
    });

    it('should return document if provided existed id', async () => {
      const result = await findById(UserModel, UserTypeComposer)
        .resolve({ args: { _id: user._id } });
      expect(result).have.property('name').that.equal(user.name);
    });
  });
});
