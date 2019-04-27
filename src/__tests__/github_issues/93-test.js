/* @flow */

import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';
import { UserModel } from '../../__mocks__/userModel';

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

const UserTC = composeWithMongoose(UserModel);
schemaComposer.Query.addFields({
  users: UserTC.getResolver('findMany'),
});

describe('issue #93', () => {
  it('$or, $and operator for filtering', async () => {
    schemaComposer.Query.addFields({
      users: UserTC.getResolver('findMany'),
    });
    const schema = schemaComposer.buildSchema();
    await UserModel.create({
      _id: '100000000000000000000301',
      name: 'User301',
      age: 301,
    });
    await UserModel.create({
      _id: '100000000000000000000302',
      name: 'User302',
      age: 302,
      gender: 'male',
    });
    await UserModel.create({
      _id: '100000000000000000000303',
      name: 'User303',
      age: 302,
      gender: 'female',
    });

    const res = await graphql.graphql(
      schema,
      `
        {
          users(filter: { OR: [{ age: 301 }, { AND: [{ gender: male }, { age: 302 }] }] }) {
            name
          }
        }
      `
    );
    expect(res).toEqual({ data: { users: [{ name: 'User301' }, { name: 'User302' }] } });
  });
});
