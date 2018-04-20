/* @flow */

import { Resolver, schemaComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel } from '../../__mocks__/userModel';
import { PostModel } from '../../__mocks__/postModel';
import findById from '../findById';
import GraphQLMongoID from '../../types/mongoid';
import { convertModelToGraphQL } from '../../fieldsConverter';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('findById() ->', () => {
  let UserTC;
  let PostTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);

    PostModel.schema._gqcTypeComposer = undefined;
    PostTypeComposer = convertModelToGraphQL(PostModel, 'Post', schemaComposer);
  });

  let user;
  let post;

  beforeEach(async () => {
    await UserModel.remove({});

    user = new UserModel({ name: 'nodkz' });
    await user.save();

    await PostModel.remove({});

    post = new PostModel({ _id: 1, title: 'Post 1' });
    await post.save();
  });

  it('should return Resolver object', () => {
    const resolver = findById(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_id` arg', () => {
      const resolver = findById(UserModel, UserTC);
      expect(resolver.hasArg('_id')).toBe(true);
      const argConfig: any = resolver.getArgConfig('_id');
      expect(argConfig.type).toBeInstanceOf(GraphQLNonNull);
      expect(argConfig.type.ofType).toBe(GraphQLMongoID);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findById(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should be rejected if args.id is not objectId', async () => {
      const result = findById(UserModel, UserTC).resolve({ args: { _id: 1 } });
      await expect(result).rejects.toBeDefined();
    });

    it('should return null if args.id is empty', async () => {
      const result = await findById(UserModel, UserTC).resolve({});
      expect(result).toBe(null);
    });

    it('should return document if provided existed id', async () => {
      const result = await findById(UserModel, UserTC).resolve({
        args: { _id: user._id },
      });
      expect(result.name).toBe(user.name);
    });

    it('should return mongoose document', async () => {
      const result = await findById(UserModel, UserTC).resolve({
        args: { _id: user._id },
      });
      expect(result).toBeInstanceOf(UserModel);
    });

    it('should return mongoose Post document', async () => {
      const result = await findById(PostModel, PostTypeComposer).resolve({
        args: { _id: 1 },
      });
      expect(result).toBeInstanceOf(PostModel);
    });
  });
});
