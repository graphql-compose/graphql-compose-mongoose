/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import findByIds from '../findByIds';
import { Resolver } from 'graphql-compose';
import { GraphQLNonNull, GraphQLList } from 'graphql';
import GraphQLMongoID from '../../types/mongoid';
import { mongooseModelToTypeComposer } from '../../modelConverter';

const UserTypeComposer = mongooseModelToTypeComposer(UserModel);

describe('findByIds() ->', () => {
  let user1;
  let user2;
  let user3;

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

    it('should return empty array if args._ids is not valid objectIds', async () => {
      const result = await findByIds(UserModel, UserTypeComposer).resolve({ args: { _ids: ['d', 'e'] } });
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
  });
});
