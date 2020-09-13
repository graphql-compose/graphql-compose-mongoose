import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel, IUser } from '../../__mocks__/userModel';
import { findOne } from '../findOne';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

let UserTC: ObjectTypeComposer;
let user1: IUser;
let user2: IUser;

beforeEach(async () => {
  schemaComposer.clear();
  UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);

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

describe('findOne() ->', () => {
  it('should return Resolver object', () => {
    const resolver = findOne(UserModel, UserTC);
    expect(resolver).toBeInstanceOf(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` optional arg', () => {
      const resolver = findOne(UserModel, UserTC);
      expect(resolver.getArgTypeName('filter')).toBe('FilterFindOneUserInput');
    });

    it('should have user.contacts.mail as optional field', () => {
      const resolver = findOne(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldITC('contacts').getFieldTypeName('email')).toBe(
        'String'
      );
    });

    it('should have `filter` arg only with indexed fields', async () => {
      const resolver = findOne(UserModel, UserTC, {
        filter: { onlyIndexed: true, operators: false },
      });
      expect(resolver.getArgITC('filter').getFieldNames()).toEqual(
        expect.arrayContaining(['_id', 'name', 'employment'])
      );
    });

    it('should have `filter` arg with required `name` field', async () => {
      const resolver = findOne(UserModel, UserTC, {
        filter: { requiredFields: 'name' },
      });
      expect(resolver.getArgITC('filter').getFieldType('name')).toBeInstanceOf(GraphQLNonNull);
    });

    it('should have `skip` arg', () => {
      const resolver = findOne(UserModel, UserTC);
      expect(resolver.hasArg('skip')).toBe(true);
    });

    it('should have `sort` arg', () => {
      const resolver = findOne(UserModel, UserTC);
      expect(resolver.hasArg('sort')).toBe(true);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findOne(UserModel, UserTC).resolve({});
      await expect(result).resolves.toBeDefined();
    });

    it('should return one document if args is empty', async () => {
      const result = await findOne(UserModel, UserTC).resolve({ args: {} });
      expect(typeof result).toBe('object');
      expect([user1.name, user2.name]).toContain(result.name);
    });

    it('should return document if provided existed id', async () => {
      const result = await findOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1._id } },
      });
      expect(result.name).toBe(user1.name);
    });

    it('should skip records', async () => {
      const result = await findOne(UserModel, UserTC).resolve({ args: { skip: 2000 } });
      expect(result).toBeNull();
    });

    it('should sort records', async () => {
      const result1 = await findOne(UserModel, UserTC).resolve({
        args: { sort: { _id: 1 } },
      });

      const result2 = await findOne(UserModel, UserTC).resolve({
        args: { sort: { _id: -1 } },
      });

      expect(`${result1._id}`).not.toBe(`${result2._id}`);
    });

    it('should return mongoose document', async () => {
      const result = await findOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1._id } },
      });
      expect(result).toBeInstanceOf(UserModel);
    });

    it('should return lean object with alias support', async () => {
      const result = await findOne(UserModel, UserTC, { lean: true }).resolve({
        args: { filter: { _id: user1._id } },
      });
      expect(result).not.toBeInstanceOf(UserModel);
      // should translate aliases fields
      expect(result).toEqual(expect.objectContaining({ name: 'userName1' }));
    });

    it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
      const result = await findOne(UserModel, UserTC).resolve({
        args: { filter: { _id: user1._id } },
        beforeQuery(query: any, rp: ExtendedResolveParams) {
          expect(rp.model).toBe(UserModel);
          expect(rp.query).toHaveProperty('exec');
          return query.where({ _id: user2._id });
        },
      });

      expect(result._id).toEqual(user2._id);
    });
  });

  describe('Resolver.getType()', () => {
    it('should return model type', () => {
      const outputType = findOne(UserModel, UserTC).getType();
      expect(outputType).toBe(UserTC.getType());
    });

    it('should have all fields optional in filter', () => {
      const resolver = findOne(UserModel, UserTC);
      expect(resolver.getArgITC('filter').getFieldTypeName('name')).toBe('String');
      expect(resolver.getArgITC('filter').getFieldTypeName('age')).toBe('Float');
    });
  });
});
