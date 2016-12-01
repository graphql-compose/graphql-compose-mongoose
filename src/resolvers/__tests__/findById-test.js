/* @flow */

import { expect } from 'chai';
import { GraphQLNonNull } from 'graphql';
import { Resolver } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import { PostModel } from '../../__mocks__/postModel';
import findById from '../findById';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';

const UserTypeComposer = composeWithMongoose(UserModel);
const PostTypeComposer = composeWithMongoose(PostModel);

describe('findById() ->', () => {
  let user;
  let post;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  before('add test user document to mongoDB', (done) => {
    user = new UserModel({ name: 'nodkz' });
    user.save(done);
  });

  before('clear PostModel collection', (done) => {
    PostModel.collection.drop(() => {
      done();
    });
  });

  before('add test post document with integer _id to mongoDB', (done) => {
    post = new PostModel({ _id: 1, title: 'Post 1' });
    post.save(done);
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

    it('should return mongoose document', async () => {
      const result = await findById(UserModel, UserTypeComposer).resolve({
        args: { _id: user._id },
      });
      expect(result).instanceof(UserModel);
    });

    it('should return mongoose Post document', async () => {
      const result = await findById(PostModel, PostTypeComposer).resolve({
        args: { _id: 1 },
      });
      expect(result).instanceof(PostModel);
    });
  });
});
