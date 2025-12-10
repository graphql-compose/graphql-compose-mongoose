import { graphql, schemaComposer } from 'graphql-compose';
import { composeWithMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';

const EventSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    level: { type: String, required: true },
    message: { type: String, required: true },
    meta: {
      topic: { type: String },
      subjects: { type: [String] },
      variables: { type: Map, of: String },
    },
  },
  { collection: 'events' }
);

const EventModel = mongoose.model('Event', EventSchema);
const EventTC = composeWithMongoose(EventModel);
EventTC.getResolvers().forEach((resolver) => {
  const newResolver = resolver.addFilterArg({
    name: 'subjects',
    filterTypeNameFallback: 'FilterEventInput',
    type: '[String]',
    query: (query, value) => {
      query['meta.subjects'] = { $elemMatch: { $in: value } };
    },
  });

  EventTC.setResolver(resolver.name, newResolver);
});
schemaComposer.Query.addFields({
  eventMany: EventTC.getResolver('findMany'),
});
const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await EventModel.base.createConnection();
  await EventModel.create({
    timestamp: new Date(),
    level: 'status',
    message: 'event1',
    meta: {
      topic: 'topic',
      subjects: ['metaValue'],
    },
  });
  await EventModel.create({
    timestamp: new Date(),
    level: 'status',
    message: 'event2',
    meta: {
      topic: 'topic',
      subjects: ['notMetaValue'],
    },
  });
});
afterAll(() => EventModel.base.disconnect());

// Issue from graphql-compose repo
// @see https://github.com/graphql-compose/graphql-compose/pull/282
describe('graphql-compose/issue #282 - Filter nested array by string', () => {
  it('correct request', async () => {
    expect(
      await graphql.graphql({
        schema,
        source: `query {
          eventMany(filter: { subjects: ["notMetaValue"] }) {
            message
            meta {
              subjects
            }
          }
        }`,
      })
    ).toEqual({
      data: { eventMany: [{ message: 'event2', meta: { subjects: ['notMetaValue'] } }] },
    });
  });
});
