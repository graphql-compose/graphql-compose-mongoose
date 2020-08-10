import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { UserModel, IUser } from '../../__mocks__/userModel';
import findMany from '../findMany';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('findMany() ->', () => {
  let UserTC: ObjectTypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
  });

  let user1: IUser;
  let user2: IUser;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user1 = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
    });

    user2 = new UserModel({
      name: 'userName2',
      skills: ['go', 'erlang'],
      gender: 'female',
      relocation: false,
    });

    await user1.save();
    await user2.save();
  });

  it('should return Resolver object', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  it('Resolver object should have `filter` arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.hasArg('filter')).toBe(true);
  });

  it('Resolver object should have `limit` arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.hasArg('limit')).toBe(true);
  });

  it('Resolver object should have `skip` arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.hasArg('skip')).toBe(true);
  });

  it('Resolver object should have `sort` arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.hasArg('sort')).toBe(true);
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled Promise', async () => {
      const result = findMany(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return array of documents if args is empty', async () => {
      const result = await findMany(UserModel, UserTC).resolve({});

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result.map((d: any) => d.name)).toEqual(
        expect.arrayContaining([user1.name, user2.name])
      );
    });

    it('should limit records', async () => {
      const result = await findMany(UserModel, UserTC).resolve({ args: { limit: 1 } });

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
    });

    it('should skip records', async () => {
      const result = await findMany(UserModel, UserTC).resolve({ args: { skip: 1000 } });

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });

    it('should sort records', async () => {
      const result1 = await findMany(UserModel, UserTC).resolve({
        args: { sort: { _id: 1 } },
      });

      const result2 = await findMany(UserModel, UserTC).resolve({
        args: { sort: { _id: -1 } },
      });

      expect(`${result1[0]._id}`).not.toBe(`${result2[0]._id}`);
    });

    it('should return mongoose documents', async () => {
      const result = await findMany(UserModel, UserTC).resolve({ args: { limit: 2 } });
      expect(result[0]).toBeInstanceOf(UserModel);
      expect(result[1]).toBeInstanceOf(UserModel);
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const result = await findMany(UserModel, UserTC).resolve({
        args: { limit: 2 },
        beforeQuery(_: any, rp: ExtendedResolveParams) {
          expect(rp.model).toBe(UserModel);
          expect(rp.query).toHaveProperty('exec');
          return [{ overridden: true }];
        },
      });

      expect(result).toEqual([{ overridden: true }]);
    });
  });

  describe('Resolver.getType()', () => {
    it('should have all fields optional in filter', () => {
      const resolver = findMany(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldTypeName('name')).toBe('String');
      expect(resolver.getArgITC('filter').getFieldTypeName('age')).toBe('Float');
    });
  });
});
