/* @flow */

import { Resolver, graphql } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import { PostModel } from '../../__mocks__/postModel';
import findByIds from '../findByIds';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const { GraphQLNonNull, GraphQLList } = graphql;

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('findByIds() ->', () => {
  let UserTypeComposer;
  let PostTypeComposer;

  beforeEach(() => {
    typeStorage.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTypeComposer = composeWithMongoose(UserModel);

    PostModel.schema._gqcTypeComposer = undefined;
    PostTypeComposer = composeWithMongoose(PostModel);
  });

  let user1;
  let user2;
  let user3;
  let post1;
  let post2;
  let post3;

  beforeEach(async () => {
    await UserModel.remove({});

    user1 = new UserModel({ name: 'nodkz1' });
    user2 = new UserModel({ name: 'nodkz2' });
    user3 = new UserModel({ name: 'nodkz3' });

    await Promise.all([user1.save(), user2.save(), user3.save()]);

    await PostModel.remove({});

    post1 = new PostModel({ _id: 1, title: 'Post 1' });
    post2 = new PostModel({ _id: 2, title: 'Post 2' });
    post3 = new PostModel({ _id: 3, title: 'Post 3' });

    await Promise.all([post1.save(), post2.save(), post3.save()]);
  });

  it('should return Resolver object', () => {
    const resolver = findByIds(UserModel, UserTypeComposer);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_ids` arg', () => {
      const resolver = findByIds(UserModel, UserTypeComposer);
      expect(resolver.hasArg('_ids')).toBe(true);
      const argConfig = resolver.getArg('_ids');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      // $FlowFixMe
      expect(argConfig.type.ofType).toBeInstanceOf(GraphQLList);
      // $FlowFixMe
      expect(argConfig.type.ofType.ofType).toBe(GraphQLMongoID);
    });

    it('should have `limit` arg', () => {
      const resolver = findByIds(UserModel, UserTypeComposer);
      expect(resolver.hasArg('limit')).toBe(true);
    });

    it('should have `sort` arg', () => {
      const resolver = findByIds(UserModel, UserTypeComposer);
      expect(resolver.hasArg('sort')).toBe(true);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findByIds(UserModel, UserTypeComposer).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return empty array if args._ids is empty', async () => {
      const result = await findByIds(UserModel, UserTypeComposer).resolve({});
      expect(result).toBeInstanceOf(Array);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return array of documents', async () => {
      const result = await findByIds(UserModel, UserTypeComposer).resolve({
        args: { _ids: [user1._id, user2._id, user3._id] },
      });

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(3);
      expect(result.map(d => d.name)).toEqual(
        expect.arrayContaining([user1.name, user2.name, user3.name])
      );
    });

    it('should return array of documents if object id is string', async () => {
      const stringId = `${user1._id}`;
      const result = await findByIds(UserModel, UserTypeComposer).resolve({
        args: { _ids: [stringId] },
      });

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
    });

    it('should return array of documents if args._ids are integers', async () => {
      const result = await findByIds(PostModel, PostTypeComposer).resolve({
        args: { _ids: [1, 2, 3] },
      });
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(3);
    });

    it('should return mongoose documents', async () => {
      const result = await findByIds(UserModel, UserTypeComposer).resolve({
        args: { _ids: [user1._id, user2._id] },
      });
      expect(result[0]).toBeInstanceOf(UserModel);
      expect(result[1]).toBeInstanceOf(UserModel);
    });
  });
});
