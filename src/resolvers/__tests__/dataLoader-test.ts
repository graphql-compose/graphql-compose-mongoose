import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { PostModel, IPost } from '../../__mocks__/postModel';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { dataLoader } from '../dataLoader';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';
import { GraphQLResolveInfo } from 'graphql';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

// mock GraphQLResolveInfo
const info = { fieldNodes: {} } as GraphQLResolveInfo;

describe('dataLoader() ->', () => {
  let UserTC: ObjectTypeComposer;
  let PostTypeComposer: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    PostTypeComposer = convertModelToGraphQL(PostModel, 'Post', schemaComposer);
  });

  let user: IUser;
  let user2: IUser;
  let post: IPost;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user = new UserModel({ name: 'nodkz', contacts: { email: 'mail' } });
    await user.save();

    user2 = new UserModel({ name: 'user2', contacts: { email: 'mail2' } });
    await user2.save();

    await PostModel.deleteMany({});

    post = new PostModel({ _id: 1, title: 'Post 1' });
    await post.save();
  });

  it('should return Resolver object', () => {
    const resolver = dataLoader(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_id` arg', () => {
      const resolver = dataLoader(UserModel, UserTC);
      expect(resolver.getArgTypeName('_id')).toBe('MongoID!');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = dataLoader(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should be rejected if args.id is not objectId', async () => {
      const result = dataLoader(UserModel, UserTC).resolve({
        args: { _id: 1 },
        context: {},
        info,
      });
      await expect(result).rejects.toBeDefined();
    });

    it('should return null if args.id is empty', async () => {
      const result = await dataLoader(UserModel, UserTC).resolve({});
      expect(result).toBe(null);
    });

    it('should return document if provided existed id', async () => {
      const result = await dataLoader(UserModel, UserTC).resolve({
        args: { _id: user._id },
        context: {},
        info,
      });
      expect(result.name).toBe(user.name);
    });

    it('should return mongoose document', async () => {
      const result = await dataLoader(UserModel, UserTC).resolve({
        args: { _id: user._id },
        context: {},
        info,
      });
      expect(result).toBeInstanceOf(UserModel);
    });

    it('should return lean object from DB', async () => {
      const result = await dataLoader(UserModel, UserTC, { lean: true }).resolve({
        args: { _id: user._id },
        context: {},
        info,
      });
      expect(result).not.toBeInstanceOf(UserModel);
    });

    it('should return mongoose Post document', async () => {
      const result = await dataLoader(PostModel, PostTypeComposer).resolve({
        args: { _id: 1 },
        context: {},
        info,
      });
      expect(result).toBeInstanceOf(PostModel);
    });

    it('should return lean Post object directly from DB', async () => {
      const result = await dataLoader(PostModel, PostTypeComposer, { lean: true }).resolve({
        args: { _id: 1 },
        context: {},
        info,
      });
      expect(result).not.toBeInstanceOf(PostModel);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const result = await dataLoader(PostModel, PostTypeComposer).resolve({
        args: { _id: 1 },
        context: {},
        info,
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toHaveProperty('exec');
          expect(rp.model).toBe(PostModel);
          return [{ _id: 1, overridden: true }];
        },
      });
      expect(result).toEqual({ _id: 1, overridden: true });
    });
  });

  it('check DataLoader batch logic', async () => {
    let conditions;
    const resolveParams = {
      context: {},
      info,
      beforeQuery: (query: any) => {
        conditions = query._conditions;
      },
    };
    const resolver = dataLoader(UserModel, UserTC);
    const resultPromise1 = resolver.resolve({
      args: { _id: user2._id },
      ...resolveParams,
    });
    const resultPromise2 = resolver.resolve({
      args: { _id: user._id },
      ...resolveParams,
    });
    const resultPromise3 = resolver.resolve({
      args: { _id: user._id },
      ...resolveParams,
    });
    const resultPromise4 = resolver.resolve({
      args: { _id: user._id },
      ...resolveParams,
    });

    const nonExistedId = mongoose.Types.ObjectId('5cefda4616156200084e5170');
    const resultPromise5 = resolver.resolve({
      args: { _id: nonExistedId },
      ...resolveParams,
    });

    // should return correct results
    expect((await resultPromise1).name).toEqual('user2');
    expect((await resultPromise2).name).toEqual('nodkz');
    expect((await resultPromise3).name).toEqual('nodkz');
    expect((await resultPromise4).name).toEqual('nodkz');

    // should use $in operator and combine duplicated ids
    expect(conditions).toEqual({
      _id: { $in: [user2._id, user._id, nonExistedId] },
    });

    // return undefined for not found record
    expect(await resultPromise5).toBe(undefined);
  });

  it('check aliases for lean record', async () => {
    const resolver = dataLoader(UserModel, UserTC, { lean: true });
    const resultPromise1 = resolver.resolve({
      args: { _id: user2._id },
      context: {},
      info,
    });
    expect((await resultPromise1).name).toEqual('user2');
  });
});
