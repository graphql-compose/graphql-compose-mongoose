import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { PostModel, IPost } from '../../__mocks__/postModel';
import { findByIds } from '../findByIds';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('findByIds() ->', () => {
  let UserTC: ObjectTypeComposer;
  let PostTypeComposer: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
    PostTypeComposer = convertModelToGraphQL(PostModel, 'Post', schemaComposer);
  });

  let user1: IUser;
  let user2: IUser;
  let user3: IUser;
  let post1: IPost;
  let post2: IPost;
  let post3: IPost;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user1 = new UserModel({ name: 'nodkz1', contacts: { email: 'mail' } });
    user2 = new UserModel({ name: 'nodkz2', contacts: { email: 'mail' } });
    user3 = new UserModel({ name: 'nodkz3', contacts: { email: 'mail' } });

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
      expect(resolver.getArgTypeName('_ids')).toBe('[MongoID!]!');
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
      expect(result.map((d: any) => d.name)).toEqual(
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

    it('should return lean records with alias support', async () => {
      const result = await findByIds(UserModel, UserTC, { lean: true }).resolve({
        args: { _ids: [user1._id, user2._id] },
      });
      expect(result[0]).not.toBeInstanceOf(UserModel);
      expect(result[1]).not.toBeInstanceOf(UserModel);
      // should translate aliases fields
      expect(result).toEqual([
        expect.objectContaining({ name: 'nodkz1' }),
        expect.objectContaining({ name: 'nodkz2' }),
      ]);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const result = await findByIds(UserModel, UserTC).resolve({
        args: { _ids: [user1._id, user2._id] },
        beforeQuery(query: any, rp: ExtendedResolveParams) {
          expect(rp.model).toBe(UserModel);
          expect(rp.query).toHaveProperty('exec');
          return query.where({ _id: user1._id });
        },
      });

      expect(result).toHaveLength(1);
    });
  });
});
