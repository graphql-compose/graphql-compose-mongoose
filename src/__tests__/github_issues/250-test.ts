/* eslint-disable no-param-reassign */

import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';
import { UserModel } from '../../__mocks__/userModel';

beforeAll(async () => {
  await UserModel.base.createConnection();
  await UserModel.create({
    name: 'AAAAA',
    age: 10,
    contacts: { email: '1@1.com' },
  });
  await UserModel.create({
    name: 'BBBBB',
    age: 20,
    gender: 'male',
    contacts: { email: '2@2.com', skype: 'aaa' },
  });
  await UserModel.create({
    name: 'CCCCC',
    age: 30,
    contacts: { email: '3@3.com' },
  });
});
afterAll(() => UserModel.base.disconnect());

const UserTC = composeWithMongoose(UserModel, {
  resolvers: {
    findMany: {
      filter: {
        operators: true,
      },
    },
  },
});
// console.log(UserTC.getResolver('findOne').getArgITC('filter').toSDL({ deep: true }));
schemaComposer.Query.addFields({
  findMany: UserTC.getResolver('findMany'),
});
const schema = schemaComposer.buildSchema();

describe('issue #250 - Adds support for nested `_operators`, add `exists`, `regex` operators', () => {
  it('check `exist` operator', async () => {
    expect(
      await graphql.graphql(
        schema,
        `query {
          findMany(filter: { _operators: { gender: { exists: true } } }) {
            name
            gender
          }
        }`
      )
    ).toEqual({ data: { findMany: [{ gender: 'male', name: 'BBBBB' }] } });
  });

  it('check nested `exist` operator', async () => {
    expect(
      await graphql.graphql(
        schema,
        `query {
          findMany(filter: { _operators: { contacts: { skype: { exists: true } } } }) {
            name
          }
        }`
      )
    ).toEqual({ data: { findMany: [{ name: 'BBBBB' }] } });
  });

  it('check `regex` operator', async () => {
    expect(
      await graphql.graphql(
        schema,
        `query {
          findMany(filter: { _operators: { name: { regex: "^AA|CC.*" } } }) {
            name
          }
        }`
      )
    ).toEqual({ data: { findMany: [{ name: 'AAAAA' }, { name: 'CCCCC' }] } });
  });

  it('check nested `regex` operator', async () => {
    expect(
      await graphql.graphql(
        schema,
        `query {
          findMany(filter: { _operators: { contacts: { email: { regex: "/3.COM/i" } } } }) {
            name
          }
        }`
      )
    ).toEqual({ data: { findMany: [{ name: 'CCCCC' }] } });
  });

  it('check combined nested `regex` operator', async () => {
    expect(
      await graphql.graphql(
        schema,
        `query {
          findMany(
            filter: { OR: [
              { _operators: { contacts: { email: { regex: "/3.COM/i" } } } },
              { _operators: { contacts: { skype: { exists: true } } } }
            ]}
          ) {
            name
          }
        }`
      )
    ).toEqual({ data: { findMany: [{ name: 'BBBBB' }, { name: 'CCCCC' }] } });
  });
});
