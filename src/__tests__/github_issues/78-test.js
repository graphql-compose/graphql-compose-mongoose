/* @flow */

import mongoose from 'mongoose';
import MongodbMemoryServer from 'mongodb-memory-server';
import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';

let mongoServer;
beforeAll(async () => {
  mongoServer = new MongodbMemoryServer();
  const mongoUri = await mongoServer.getConnectionString();
  await mongoose.connect(mongoUri, { useNewUrlParser: true });
});

afterAll(() => {
  mongoose.disconnect();
  mongoServer.stop();
});

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

describe('issue #78 - Mongoose and Discriminators', () => {
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

    schemaComposer.Query.addFields({
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
