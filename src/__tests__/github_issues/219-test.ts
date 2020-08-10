/* eslint-disable no-param-reassign */

import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';
import { UserModel } from '../../__mocks__/userModel';

beforeAll(async () => {
  await UserModel.base.createConnection();
  await UserModel.create({
    name: 'AAAAA',
    age: 10,
  });
  await UserModel.create({
    name: 'BBBBB',
    age: 20,
  });
});
afterAll(() => UserModel.base.disconnect());

const UserTC = composeWithMongoose(UserModel);

describe('issue #219 - Authorization using wrapResolve', () => {
  it('correct request', async () => {
    UserTC.wrapResolverResolve('findOne', (next) => (rp) => {
      rp.beforeQuery = async (query: any) => {
        // Choose any case or mix of them
        // 1) check rp.context
        // 2) make another query await Permission.find();
        // 3) modify query = query.where({ perm: 'ALLOWED', userId: context?.req?.user?.id })
        query = query.where({ age: { $gt: 19 } });

        // 4) return cached data return UserCachedData[rp.args.id];
        if (rp?.args?.filter?.name === 'CACHED') {
          return { name: 'CACHED', age: 99 };
        }

        // 5) just check arg value
        if (rp?.args?.filter?.name === 'ERROR') {
          throw new Error('Wrong arg!');
        }

        return query.exec();
      };
      return next(rp);
    });
    schemaComposer.Query.addFields({
      findUser: UserTC.getResolver('findOne'),
    });
    const schema = schemaComposer.buildSchema();
    expect(
      await graphql.graphql(
        schema,
        `query {
          findUser(filter: { name: "AAAAA" }) {
            name
            age
          }
        }`
      )
    ).toEqual({ data: { findUser: null } });

    expect(
      await graphql.graphql(
        schema,
        `query {
          findUser(filter: { name: "BBBBB" }) {
            name
            age
          }
        }`
      )
    ).toEqual({ data: { findUser: { age: 20, name: 'BBBBB' } } });

    expect(
      await graphql.graphql(
        schema,
        `query {
          findUser(filter: { name: "CACHED" }) {
            name
            age
          }
        }`
      )
    ).toEqual({ data: { findUser: { age: 99, name: 'CACHED' } } });

    expect(
      await graphql.graphql(
        schema,
        `query {
          findUser(filter: { name: "ERROR" }) {
            name
            age
          }
        }`
      )
    ).toEqual({ data: { findUser: null }, errors: [new Error('Wrong arg!')] });
  });
});
