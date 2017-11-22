/* @flow */

import { GQC } from 'graphql-compose';
import { graphql } from 'graphql-compose/lib/graphql';
import { UserModel } from '../__mocks__/userModel';
import { composeWithMongoose } from '../index';
import typeStorage from '../typeStorage';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('integration tests', () => {
  beforeEach(() => {
    typeStorage.clear();
    UserModel.schema._gqcTypeComposer = undefined;
  });

  describe('projection', async () => {
    let schema;
    let UserTC;
    beforeAll(async () => {
      UserTC = composeWithMongoose(UserModel);
      UserTC.addFields({
        rawData: {
          type: 'JSON',
          resolve: source => source.toJSON(),
          projection: { '*': true },
        },
      });
      GQC.rootQuery().addFields({
        user: UserTC.getResolver('findById'),
      });
      schema = GQC.buildSchema();
      await UserModel.create({
        _id: '100000000000000000000000',
        name: 'Name',
        age: 20,
        gender: 'male',
        skills: ['a', 'b', 'c'],
        relocation: true,
      });
    });

    it('should request only fields from query', async () => {
      const res = await graphql(schema, '{ user(_id: "100000000000000000000000") { name } }');
      expect(res).toMatchSnapshot('projection from query fields');
    });

    it('should request all fields to rawData field', async () => {
      const res: any = await graphql(
        schema,
        '{ user(_id: "100000000000000000000000") { rawData } }'
      );
      expect(Object.keys(res.data.user.rawData)).toMatchSnapshot('projection from all fields');
    });
  });
});
