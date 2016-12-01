/* @flow */

import { expect } from 'chai';
import { GraphQLNonNull, GraphQLList } from 'graphql';
import { Resolver } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import { PostModel } from '../../__mocks__/postModel';
import findByIds from '../findByIds';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';

const UserTypeComposer = composeWithMongoose(UserModel);
const PostTypeComposer = composeWithMongoose(PostModel);

describe('findByIds() ->', () => {
  let user1;
  let user2;
  let user3;
  let post1;
  let post2;
  let post3;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  before('add test users documents to mongoDB', (done) => {
    user1 = new UserModel({ name: 'nodkz1' });
    user2 = new UserModel({ name: 'nodkz2' });
    user3 = new UserModel({ name: 'nodkz3' });

    Promise.all([
      user1.save(),
      user2.save(),
      user3.save(),
    ]).then(() => done());
  });

  before('clear PostModel collection', (done) => {
    PostModel.collection.drop(() => {
      done();
    });
  });

  before('add test post documents with integer _id to mongoDB', (done) => {
    post1 = new PostModel({ _id: 1, title: 'Post 1' });
    post2 = new PostModel({ _id: 2, title: 'Post 2' });
    post3 = new PostModel({ _id: 3, title: 'Post 3' });

    Promise.all([
      post1.save(),
      post2.save(),
      post3.save(),
    ]).then(() => done());
  });

  it('should return Resolver object', () => {
    const resolver = findByIds(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_ids` arg', () => {
      const resolver = findByIds(UserModel, UserTypeComposer);
      expect(resolver.hasArg('_ids')).to.be.true;
      const argConfig = resolver.getArg('_ids');
      expect(argConfig).property('type').that.instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType').that.instanceof(GraphQLList);
      expect(argConfig).deep.property('type.ofType.ofType').that.equal(GraphQLMongoID);
    });

    it('should have `limit` arg', () => {
      const resolver = findByIds(UserModel, UserTypeComposer);
      expect(resolver.hasArg('limit')).to.be.true;
    });

    it('should have `sort` arg', () => {
      const resolver = findByIds(UserModel, UserTypeComposer);
      expect(resolver.hasArg('sort')).to.be.true;
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findByIds(UserModel, UserTypeComposer).resolve({});
      await expect(result).be.fulfilled;
    });

    it('should return empty array if args._ids is empty', async () => {
      const result = await findByIds(UserModel, UserTypeComposer).resolve({});
      expect(result).to.be.instanceOf(Array);
      expect(result).to.be.empty;
    });

    it('should return array of documents', async () => {
      const result = await findByIds(UserModel, UserTypeComposer)
        .resolve({ args: { _ids: [user1._id, user2._id, user3._id] } });

      expect(result).to.be.instanceOf(Array);
      expect(result).to.have.lengthOf(3);
      expect(result.map(d => d.name))
        .to.have.members([user1.name, user2.name, user3.name]);
    });

    it('should return array of documents if object id is string', async () => {
      const stringId = `${user1._id}`;
      const result = await findByIds(UserModel, UserTypeComposer)
        .resolve({ args: { _ids: [stringId] } });

      expect(result).to.be.instanceOf(Array);
      expect(result).to.have.lengthOf(1);
    });

    it('should return array of documents if args._ids are integers', async () => {
      const result = await findByIds(PostModel, PostTypeComposer)
        .resolve({ args: { _ids: [1, 2, 3] } });
      expect(result).to.be.instanceOf(Array);
      expect(result).to.have.lengthOf(3);
    });

    it('should return mongoose documents', async () => {
      const result = await findByIds(UserModel, UserTypeComposer)
        .resolve({ args: { _ids: [user1._id, user2._id] } });
      expect(result).property('0').instanceof(UserModel);
      expect(result).property('1').instanceof(UserModel);
    });
  });
});
