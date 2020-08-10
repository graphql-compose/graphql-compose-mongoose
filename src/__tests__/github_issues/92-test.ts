import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';
import { UserModel } from '../../__mocks__/userModel';

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

beforeAll(() => UserModel.base.createConnection());
afterAll(() => UserModel.base.disconnect());

const UserTC = composeWithMongoose(UserModel);
schemaComposer.Query.addFields({
  users: UserTC.getResolver('findMany'),
});

describe('issue #92 - How to verify the fields?', () => {
  UserTC.wrapResolverResolve('createOne', (next) => (rp) => {
    if (rp.args.record.age < 21) throw new Error('You are too young');
    if (rp.args.record.age > 60) throw new Error('You are too old');
    return next(rp);
  });

  schemaComposer.Mutation.addFields({
    addUser: UserTC.getResolver('createOne'),
  });
  const schema = schemaComposer.buildSchema();

  it('correct request', async () => {
    const result: any = await graphql.graphql(
      schema,
      `
          mutation {
            addUser(record: { name: "User1", age: 30 }) {
              record {
                name
                age
              }
            }
          }
        `
    );
    expect(result).toEqual({ data: { addUser: { record: { age: 30, name: 'User1' } } } });
  });

  it('wrong request', async () => {
    const result: any = await graphql.graphql(
      schema,
      `
          mutation {
            addUser(record: { name: "User1", age: 10 }) {
              record {
                name
                age
              }
            }
          }
        `
    );
    expect(result).toEqual({ data: { addUser: null }, errors: expect.anything() });
    expect(result.errors[0].message).toBe('You are too young');
  });
});
