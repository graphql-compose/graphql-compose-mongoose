import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { PostModel, IPost } from '../../__mocks__/postModel';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { dataLoaderManyLean } from '../dataLoaderManyLean';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';
import { GraphQLResolveInfo } from 'graphql';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

// mock GraphQLResolveInfo
const info = { fieldNodes: {} } as GraphQLResolveInfo;

describe('dataLoaderManyLean() ->', () => {
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
    const resolver = dataLoaderManyLean(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_id` arg', () => {
      const resolver = dataLoaderManyLean(UserModel, UserTC);
      expect(resolver.getArgTypeName('_ids')).toBe('[MongoID!]!');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = dataLoaderManyLean(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return Error if args.ids contains incorrect ObjectId', async () => {
      // For more info see https://github.com/graphql/dataloader#loadmanykeys
      //   var [ a, b, c ] = await myLoader.loadMany([ 'a', 'b', 'badKey' ]);
      //   // c instanceof Error
      const result = await dataLoaderManyLean(UserModel, UserTC).resolve({
        args: { _ids: [1] },
        context: {},
        info,
      });
      expect(result[0]).toBeInstanceOf(Error);
      expect(result[0].message).toMatch('Cast to ObjectId failed');
    });

    it('should return null if args.ids is empty', async () => {
      const result = await dataLoaderManyLean(UserModel, UserTC).resolve({});
      expect(result).toEqual([]);
    });

    it('should return document if provided existed id', async () => {
      const result = await dataLoaderManyLean(UserModel, UserTC).resolve({
        args: { _ids: [user._id] },
        context: {},
        info,
      });
      expect(result[0].name).toBe(user.name);
    });

    it('should return lean objects from DB', async () => {
      const result = await dataLoaderManyLean(UserModel, UserTC).resolve({
        args: { _ids: [user._id] },
        context: {},
        info,
      });
      expect(result[0]).not.toBeInstanceOf(UserModel);
    });

    it('should return lean Post object from DB', async () => {
      const result = await dataLoaderManyLean(PostModel, PostTypeComposer).resolve({
        args: { _ids: [1] },
        context: {},
        info,
      });
      expect(result[0]).not.toBeInstanceOf(PostModel);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const result = await dataLoaderManyLean(PostModel, PostTypeComposer).resolve({
        args: { _ids: [1] },
        context: {},
        info,
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toHaveProperty('exec');
          expect(rp.model).toBe(PostModel);
          return [{ _id: 1, overridden: true }];
        },
      });
      expect(result).toEqual([{ _id: 1, overridden: true }]);
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
    const resolver = dataLoaderManyLean(UserModel, UserTC);
    const resultPromise1 = resolver.resolve({
      args: { _ids: [user2._id, user._id] },
      ...resolveParams,
    });
    const resultPromise2 = resolver.resolve({
      args: { _ids: [user._id] },
      ...resolveParams,
    });

    const nonExistedId = mongoose.Types.ObjectId('5cefda4616156200084e5170');
    const resultPromise3 = resolver.resolve({
      args: { _ids: [user._id, nonExistedId] },
      ...resolveParams,
    });

    // should return correct results
    expect((await resultPromise1).map((o: any) => o.name)).toEqual(['user2', 'nodkz']);
    expect((await resultPromise2).map((o: any) => o.name)).toEqual(['nodkz']);
    // return undefined for not found record
    expect((await resultPromise3).map((o: any) => o?.name)).toEqual(['nodkz', undefined]);

    // should use $in operator and combine duplicated ids
    expect(conditions).toEqual({
      _id: { $in: [user2._id, user._id, nonExistedId] },
    });
  });
});
