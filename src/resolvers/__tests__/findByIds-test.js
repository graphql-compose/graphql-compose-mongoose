/* @flow */

import { Resolver, schemaComposer } from 'graphql-compose';
import { GraphQLNonNull, GraphQLList } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import { PostModel } from '../../__mocks__/postModel';
import findByIds from '../findByIds';
import GraphQLMongoID from '../../types/mongoid';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('findByIds() ->', () => {
  let UserTC;
  let PostTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    PostTypeComposer = convertModelToGraphQL(PostModel, 'Post', schemaComposer);
  });

  let user1;
  let user2;
  let user3;
  let post1;
  let post2;
  let post3;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user1 = new UserModel({ name: 'nodkz1' });
    user2 = new UserModel({ name: 'nodkz2' });
    user3 = new UserModel({ name: 'nodkz3' });

    await Promise.all([user1.save(), user2.save(), user3.save()]);

    await PostModel.deleteMany({});

    post1 = new PostModel({ _id: 1, title: 'Post 1' });
    post2 = new PostModel({ _id: 2, title: 'Post 2' });
    post3 = new PostModel({ _id: 3, title: 'Post 3' });

    await Promise.all([post1.save(), post2.save(), post3.save()]);
  });

  it('should return Resolver object', () => {
    const resolver = findByIds(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_ids` arg', () => {
      const resolver = findByIds(UserModel, UserTC);
      expect(resolver.hasArg('_ids')).toBe(true);
      const argConfig: any = resolver.getArgConfig('_ids');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType).toBeInstanceOf(GraphQLList);
      expect(argConfig.type.ofType.ofType).toBe(GraphQLMongoID);
    });

    it('should have `limit` arg', () => {
      const resolver = findByIds(UserModel, UserTC);
      expect(resolver.hasArg('limit')).toBe(true);
    });

    it('should have `sort` arg', () => {
      const resolver = findByIds(UserModel, UserTC);
      expect(resolver.hasArg('sort')).toBe(true);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findByIds(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return empty array if args._ids is empty', async () => {
      const result = await findByIds(UserModel, UserTC).resolve({});
      expect(result).toBeInstanceOf(Array);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return array of documents', async () => {
      const result = await findByIds(UserModel, UserTC).resolve({
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
      const result = await findByIds(UserModel, UserTC).resolve({
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
      const result = await findByIds(UserModel, UserTC).resolve({
        args: { _ids: [user1._id, user2._id] },
      });
      expect(result[0]).toBeInstanceOf(UserModel);
      expect(result[1]).toBeInstanceOf(UserModel);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const result = await findByIds(UserModel, UserTC).resolve({
        args: { _ids: [user1._id, user2._id] },
        beforeQuery(query, rp) {
          expect(rp.model).toBe(UserModel);
          expect(rp.query).toHaveProperty('exec');
          return query.where({ _id: user1._id });
        },
      });

      expect(result).toHaveLength(1);
    });
  });
});
