import { Resolver, schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { Query } from 'mongoose';
import { UserModel, IUser } from '../../__mocks__/userModel';
import connection, { prepareCursorQuery } from '../connection';
import findMany from '../findMany';
import count from '../count';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { ExtendedResolveParams } from '..';

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

describe('connection() resolver', () => {
  describe('prepareCursorQuery()', () => {
    let rawQuery;

    describe('single index', () => {
      const cursorData = { a: 10 };
      const indexKeys = Object.keys(cursorData);

      it('asc order', () => {
        const indexData = { a: 1 };

        // for beforeCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$lt', '$gt');
        expect(rawQuery).toEqual({ a: { $lt: 10 } });

        // for afterCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$gt', '$lt');
        expect(rawQuery).toEqual({ a: { $gt: 10 } });
      });

      it('desc order', () => {
        const indexData = { a: -1 };

        // for beforeCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$lt', '$gt');
        expect(rawQuery).toEqual({ a: { $gt: 10 } });

        // for afterCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$gt', '$lt');
        expect(rawQuery).toEqual({ a: { $lt: 10 } });
      });
    });

    describe('compound index', () => {
      const cursorData = { a: 10, b: 100, c: 1000 };
      const indexKeys = Object.keys(cursorData);

      it('asc order', () => {
        const indexData = { a: 1, b: -1, c: 1 };

        // for beforeCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$lt', '$gt');
        expect(rawQuery).toEqual({
          $or: [
            { a: 10, b: 100, c: { $lt: 1000 } },
            { a: 10, b: { $gt: 100 } },
            { a: { $lt: 10 } },
          ],
        });

        // for afterCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$gt', '$lt');
        expect(rawQuery).toEqual({
          $or: [
            { a: 10, b: 100, c: { $gt: 1000 } },
            { a: 10, b: { $lt: 100 } },
            { a: { $gt: 10 } },
          ],
        });
      });

      it('desc order', () => {
        const indexData = { a: -1, b: 1, c: -1 };

        // for beforeCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$lt', '$gt');
        expect(rawQuery).toEqual({
          $or: [
            { a: 10, b: 100, c: { $gt: 1000 } },
            { a: 10, b: { $lt: 100 } },
            { a: { $gt: 10 } },
          ],
        });

        // for afterCursorQuery
        rawQuery = {};
        prepareCursorQuery(rawQuery, cursorData, indexKeys, indexData, '$gt', '$lt');
        expect(rawQuery).toEqual({
          $or: [
            { a: 10, b: 100, c: { $lt: 1000 } },
            { a: 10, b: { $gt: 100 } },
            { a: { $lt: 10 } },
          ],
        });
      });
    });
  });

  describe('connection() -> ', () => {
    let UserTC: ObjectTypeComposer;

    beforeEach(() => {
      schemaComposer.clear();
      UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
      UserTC.setResolver('findMany', findMany(UserModel, UserTC));
      UserTC.setResolver('count', count(UserModel, UserTC));
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

    it('should return Resolver object with default name', () => {
      const resolver = connection(UserModel, UserTC);
      if (!resolver) throw new Error('Connection resolver is undefined');
      expect(resolver).toBeInstanceOf(Resolver);
      expect(resolver.getNestedName()).toEqual('connection');
    });

    it('should return Resolver object with custom name', () => {
      const resolver = connection(UserModel, UserTC, {
        connectionResolverName: 'customConnection',
      } as any);
      if (!resolver) throw new Error('Connection resolver is undefined');
      expect(resolver).toBeInstanceOf(Resolver);
      expect(resolver.getNestedName()).toEqual('customConnection');
    });

    it('Resolver object should have `filter` arg', () => {
      const resolver = connection(UserModel, UserTC);
      if (!resolver) throw new Error('Connection resolver is undefined');
      expect(resolver.hasArg('filter')).toBe(true);
    });

    it('Resolver object should have `sort` arg', () => {
      const resolver = connection(UserModel, UserTC);
      if (!resolver) throw new Error('Connection resolver is undefined');
      expect(resolver.hasArg('sort')).toBe(true);
    });

    it('Resolver object should have `connection args', () => {
      const resolver = connection(UserModel, UserTC);
      if (!resolver) throw new Error('Connection resolver is undefined');
      expect(resolver.hasArg('first')).toBe(true);
      expect(resolver.hasArg('last')).toBe(true);
      expect(resolver.hasArg('before')).toBe(true);
      expect(resolver.hasArg('after')).toBe(true);
    });

    it('should create custom edge type', () => {
      const resolver = connection(UserModel, UserTC, {
        edgeTypeName: 'CustomEdge',
      } as any);
      if (!resolver) throw new Error('Connection resolver is undefined');
      expect(schemaComposer.has('CustomEdge')).toBe(true);
    });

    describe('Resolver.resolve():Promise', () => {
      it('should be fulfilled Promise', async () => {
        const resolver = connection(UserModel, UserTC);
        if (!resolver) throw new Error('Connection resolver is undefined');
        const result = resolver.resolve({ args: { first: 20 } });
        await expect(result).resolves.toBeDefined();
      });

      it('should return array of documents in `edges`', async () => {
        const resolver = connection(UserModel, UserTC);
        if (!resolver) throw new Error('Connection resolver is undefined');
        const result = await resolver.resolve({ args: { first: 20 } });

        expect(result.edges).toBeInstanceOf(Array);
        expect(result.edges).toHaveLength(2);
        expect(result.edges.map((d: any) => d.node.name)).toEqual(
          expect.arrayContaining([user1.name, user2.name])
        );
      });

      it('should limit records', async () => {
        const resolver = connection(UserModel, UserTC);
        if (!resolver) throw new Error('Connection resolver is undefined');
        const result = await resolver.resolve({ args: { first: 1 } });

        expect(result.edges).toBeInstanceOf(Array);
        expect(result.edges).toHaveLength(1);
      });

      it('should sort records', async () => {
        const resolver = connection(UserModel, UserTC);
        if (!resolver) throw new Error('Connection resolver is undefined');

        const result1 = await resolver.resolve({
          args: { sort: { _id: 1 }, first: 1 },
        });

        const result2 = await resolver.resolve({
          args: { sort: { _id: -1 }, first: 1 },
        });

        expect(`${result1.edges[0].node._id}`).not.toBe(`${result2.edges[0].node._id}`);
      });

      it('should return mongoose documents', async () => {
        const resolver = connection(UserModel, UserTC);
        if (!resolver) throw new Error('Connection resolver is undefined');

        const result = await resolver.resolve({ args: { first: 20 } });
        expect(result.edges[0].node).toBeInstanceOf(UserModel);
        expect(result.edges[1].node).toBeInstanceOf(UserModel);
      });

      it('should call `beforeQuery` method with non-executed `query` as arg', async () => {
        const mongooseActions: any[] = [];

        UserModel.base.set('debug', function debugMongoose(...args: any) {
          mongooseActions.push(args);
        });

        const resolver = connection(UserModel, UserTC);

        if (!resolver) {
          throw new Error('resolver is undefined');
        }

        const result = await resolver.resolve({
          args: {},
          beforeQuery: (query: any, rp: ExtendedResolveParams) => {
            expect(query).toBeInstanceOf(Query);
            expect(rp.model).toBe(UserModel);
            // modify query before execution
            return query.where({ _id: user1.id }).limit(1989);
          },
        });

        expect(mongooseActions).toEqual([
          [
            'users',
            'find',
            { _id: user1._id },
            {
              limit: 1989,
              projection: {},
            },
          ],
        ]);

        expect(result.edges).toHaveLength(1);
      });

      it('should override result with `beforeQuery`', async () => {
        const resolver = connection(UserModel, UserTC);

        if (!resolver) {
          throw new Error('resolver is undefined');
        }

        const result = await resolver.resolve({
          args: {},
          beforeQuery: (query: any, rp: ExtendedResolveParams) => {
            expect(query).toBeInstanceOf(Query);
            expect(rp.model).toBe(UserModel);
            return [{ overrides: true }];
          },
        });

        expect(result).toHaveProperty('edges.0.node', { overrides: true });
      });

      it('should return mongoose documents for custom resolvers from opts', async () => {
        schemaComposer.clear();
        UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
        UserTC.setResolver('customFindMany', findMany(UserModel, UserTC));
        UserTC.setResolver('customCount', count(UserModel, UserTC));
        const resolver = connection(UserModel, UserTC, {
          findResolverName: 'customFindMany',
          countResolverName: 'customCount',
        } as any);
        if (!resolver) throw new Error('Connection resolver is undefined');

        const result = await resolver.resolve({ args: { first: 20 } });
        expect(result.edges[0].node).toBeInstanceOf(UserModel);
        expect(result.edges[1].node).toBeInstanceOf(UserModel);
      });
    });
  });
});
