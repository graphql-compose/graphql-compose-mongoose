import { EnumTypeComposer, ObjectTypeComposer, Resolver, schemaComposer } from 'graphql-compose';
import { IUser, UserModel } from '../../__mocks__/userModel';
import { findMany } from '../findMany';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';
import { testFieldConfig } from '../../utils/testHelpers';

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
      contacts: { email: 'mail' },
    });

    user2 = new UserModel({
      name: 'userName2',
      skills: ['go', 'erlang'],
      gender: 'female',
      relocation: false,
      contacts: { email: 'mail' },
    });

    await user1.save();
    await user2.save();
  });

  it('should return Resolver object', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  it('should have `filter` optional arg', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.getArgTypeName('filter')).toBe('FilterFindManyUserInput');
  });

  it('should have user.contacts.mail as optional field', () => {
    const resolver = findMany(UserModel, UserTC);
    expect(resolver.getArgITC('filter').getFieldITC('contacts').getFieldTypeName('email')).toBe(
      'String'
    );
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

    it('should return js lean objects with alias support', async () => {
      const result = await findMany(UserModel, UserTC, { lean: true }).resolve({
        args: { limit: 2 },
      });
      expect(result[0]).not.toBeInstanceOf(UserModel);
      expect(result[1]).not.toBeInstanceOf(UserModel);
      // should translate aliases fields
      expect(result).toEqual([
        expect.objectContaining({ name: 'userName1' }),
        expect.objectContaining({ name: 'userName2' }),
      ]);
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

  it('should support multi sort', async () => {
    let spyQuery: any;
    const resolver = findMany(UserModel, UserTC, { sort: { multi: true } }).wrapResolve(
      (next) => (rp) => {
        const res = next(rp);
        spyQuery = rp.query;
        return res;
      }
    );

    expect((resolver.getArgTC('sort') as EnumTypeComposer).getFieldNames()).toEqual(
      expect.arrayContaining([
        '_ID_ASC',
        '_ID_DESC',
        'NAME_ASC',
        'NAME_DESC',
        'NAME__AGE_ASC',
        'NAME__AGE_DESC',
      ])
    );
    const res = await testFieldConfig({
      field: resolver,
      args: {
        sort: ['_ID_ASC', 'NAME_ASC', '_ID_DESC'],
      },
      selection: `{
        name
      }`,
    });
    expect(res).toEqual([{ name: 'userName1' }, { name: 'userName2' }]);
    expect(spyQuery?.options).toEqual({ limit: 100, sort: { _id: 1, name: 1 } });
  });
});
