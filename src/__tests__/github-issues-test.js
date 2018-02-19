/* @flow */

import mongoose from 'mongoose';
import MongodbMemoryServer from 'mongodb-memory-server';
import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../index';
import { UserModel } from '../__mocks__/userModel';

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

let mongoServer;

// const opts = { useMongoClient: true }; // Mongoose 4
const opts = {}; // Mongoose 5

beforeAll(async () => {
  mongoServer = new MongodbMemoryServer();
  const mongoUri = await mongoServer.getConnectionString();
  mongoose.connect(mongoUri, opts, err => {
    if (err) console.error(err);
  });
});

afterAll(() => {
  mongoose.disconnect();
  mongoServer.stop();
});

const UserTC = composeWithMongoose(UserModel);
schemaComposer.rootQuery().addFields({
  users: UserTC.getResolver('findMany'),
});

describe('github issues checks', () => {
  describe('#78 Mongoose and Discriminators', () => {
    const options = { discriminatorKey: 'kind' };

    const eventSchema = new mongoose.Schema({ refId: String }, options);
    const Event = mongoose.model('GenericEvent', eventSchema);

    const clickedLinkSchema = new mongoose.Schema({ url: String }, options);
    const ClickedLinkEvent = Event.discriminator('ClickedLinkEvent', clickedLinkSchema);

    const EventTC = composeWithMongoose(Event);
    const ClickedLinkEventTC = composeWithMongoose(ClickedLinkEvent);

    it('creating Types from models', () => {
      expect(EventTC.getFieldNames()).toEqual(['refId', '_id', 'kind']);
      expect(ClickedLinkEventTC.getFieldNames()).toEqual(['url', '_id', 'refId', 'kind']);
    });

    it('manually override resolver output type for findMany', async () => {
      const EventDescriminatorType = new graphql.GraphQLUnionType({
        name: 'EventDescriminator',
        types: [EventTC.getType(), ClickedLinkEventTC.getType()],
        resolveType: value => {
          if (value.kind === 'ClickedLinkEvent') {
            return ClickedLinkEventTC.getType();
          }
          return EventTC.getType();
        },
      });

      EventTC.getResolver('findMany').setType(new graphql.GraphQLList(EventDescriminatorType));

      // let's check graphql response

      await Event.create({ refId: 'aaa' });
      await Event.create({ refId: 'bbb' });
      await ClickedLinkEvent.create({ refId: 'ccc', url: 'url1' });
      await ClickedLinkEvent.create({ refId: 'ddd', url: 'url2' });

      schemaComposer.rootQuery().addFields({
        eventFindMany: EventTC.getResolver('findMany'),
      });
      const schema = schemaComposer.buildSchema();

      const res = await graphql.graphql(
        schema,
        `{
        eventFindMany {
          __typename
          ... on GenericEvent {
            refId
          }
          ... on ClickedLinkEvent {
            refId
            url
          }
        }
      }`
      );

      expect(res).toEqual({
        data: {
          eventFindMany: [
            { __typename: 'GenericEvent', refId: 'aaa' },
            { __typename: 'GenericEvent', refId: 'bbb' },
            { __typename: 'ClickedLinkEvent', refId: 'ccc', url: 'url1' },
            { __typename: 'ClickedLinkEvent', refId: 'ddd', url: 'url2' },
          ],
        },
      });
    });
  });

  describe('#92 How to verify the fields?', async () => {
    UserTC.wrapResolverResolve('createOne', next => rp => {
      if (rp.args.record.age < 21) throw new Error('You are too young');
      if (rp.args.record.age > 60) throw new Error('You are too old');
      return next(rp);
    });

    schemaComposer.rootMutation().addFields({
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

  it('#93 $or, $and operator for filtering', async () => {
    schemaComposer.rootQuery().addFields({
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
