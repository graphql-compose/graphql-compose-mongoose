import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { PostModel, IPost } from '../../__mocks__/postModel';
import { findById } from '../findById';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('findById() ->', () => {
  let UserTC: ObjectTypeComposer;
  let PostTypeComposer: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    PostTypeComposer = convertModelToGraphQL(PostModel, 'Post', schemaComposer);
  });

  let user: IUser;
  let post: IPost;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user = new UserModel({ name: 'nodkz', contacts: { email: 'mail' } });
    await user.save();

    await PostModel.deleteMany({});

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
      expect(resolver.getArgTypeName('_id')).toBe('MongoID!');
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

    it('should return lean User object', async () => {
      const result = await findById(UserModel, UserTC, { lean: true }).resolve({
        args: { _id: user._id },
      });
      expect(result).not.toBeInstanceOf(UserModel);
      // aliases should be translated `User.n` -> `User.name`
      expect(result).toEqual(expect.objectContaining({ name: 'nodkz' }));
    });

    it('should return mongoose Post document', async () => {
      const result = await findById(PostModel, PostTypeComposer).resolve({
        args: { _id: 1 },
      });
      expect(result).toBeInstanceOf(PostModel);
    });

    it('should return lean Post object', async () => {
      const result = await findById(PostModel, PostTypeComposer, { lean: true }).resolve({
        args: { _id: 1 },
      });
      expect(result).not.toBeInstanceOf(PostModel);
      expect(result).toEqual({ __v: 0, _id: 1, title: 'Post 1' });
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      let beforeQueryCalled = false;

      const result = await findById(PostModel, PostTypeComposer).resolve({
        args: { _id: 1 },
        beforeQuery: (query: any, rp: ExtendedResolveParams) => {
          expect(query).toHaveProperty('exec');
          expect(rp.model).toBe(PostModel);
          beforeQueryCalled = true;
          return { overrides: true };
        },
      });

      expect(beforeQueryCalled).toBe(true);
      expect(result).toEqual({ overrides: true });
    });
  });
});
