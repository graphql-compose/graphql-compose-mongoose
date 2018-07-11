import { graphql, schemaComposer } from 'graphql-compose/lib/index';
import { mongoose } from '../__mocks__/mongooseCommon';
import { composeWithMongooseDiscriminators } from '../composeWithMongooseDiscriminators';

beforeAll(() => mongoose.connect());
afterAll(() => mongoose.disconnect());

describe('_disTypes Test With and Without test_disTypes Options set', () => {
  const options = { discriminatorKey: 'kind' };

  const eventSchema = new mongoose.Schema({ refId: String }, options);
  const Event = mongoose.model('Event', eventSchema);

  const clickedLinkSchema = new mongoose.Schema({ url: String });
  const ClickedLinkEvent = Event.discriminator('ClickedLinkEvent', clickedLinkSchema);

  afterEach(() => Event.remove({}));

  describe('No test_disTypes, Include types Manually in Query', () => {
    let EventTC;
    let ClickedLinkEventTC;

    beforeAll(() => {
      schemaComposer.clear();
      Event.schema._gqcTypeComposer = undefined;
      ClickedLinkEvent.schema._gqcTypeComposer = undefined;
      EventTC = composeWithMongooseDiscriminators(Event);
      ClickedLinkEventTC = EventTC.discriminator(ClickedLinkEvent);
    });

    it('creating Types from models', () => {
      expect(EventTC.getFieldNames()).toEqual(['_id', 'kind', 'refId']);
      expect(ClickedLinkEventTC.getFieldNames()).toEqual(['_id', 'kind', 'refId', 'url']);
    });

    it('manually override resolver output type for findMany', async () => {
      // let's check graphql response

      await Event.create({ refId: 'aaa' });
      await Event.create({ refId: 'bbb' });
      await ClickedLinkEvent.create({ refId: 'ccc', url: 'url1' });
      await ClickedLinkEvent.create({ refId: 'ddd', url: 'url2' });

      schemaComposer.rootQuery().addFields({
        eventFindMany: EventTC.getResolver('findMany'),
        ClickedLinkEvent: ClickedLinkEventTC.getResolver('findMany'),
        GenericEvent: EventTC.getResolver('findOne').setType(EventTC),
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
            kind
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
            { __typename: 'ClickedLinkEvent', kind: 'ClickedLinkEvent', refId: 'ccc', url: 'url1' },
            { __typename: 'ClickedLinkEvent', kind: 'ClickedLinkEvent', refId: 'ddd', url: 'url2' },
          ],
        },
      });
    });
  });

  describe('opts test_disTypes TRUE', () => {
    let EventTC;
    let ClickedLinkEventTC;

    beforeAll(() => {
      schemaComposer.clear();
      Event.schema._gqcTypeComposer = undefined;
      ClickedLinkEvent.schema._gqcTypeComposer = undefined;
      EventTC = composeWithMongooseDiscriminators(Event, { test_disTypes: true });
      ClickedLinkEventTC = EventTC.discriminator(ClickedLinkEvent);
    });

    it('creating Types from models', () => {
      expect(EventTC.getFieldNames()).toEqual(['_id', 'kind', 'refId']);
      expect(ClickedLinkEventTC.getFieldNames()).toEqual(['_id', 'kind', 'refId', 'url']);
    });

    it('manually override resolver output type for findMany', async () => {
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
            kind
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
            { __typename: 'ClickedLinkEvent', kind: 'ClickedLinkEvent', refId: 'ccc', url: 'url1' },
            { __typename: 'ClickedLinkEvent', kind: 'ClickedLinkEvent', refId: 'ddd', url: 'url2' },
          ],
        },
      });
    });
  });

  describe('opts test_disTypes FALSE', () => {
    let EventTC;
    let ClickedLinkEventTC;

    beforeAll(() => {
      schemaComposer.clear();
      Event.schema._gqcTypeComposer = undefined;
      ClickedLinkEvent.schema._gqcTypeComposer = undefined;
      EventTC = composeWithMongooseDiscriminators(Event, { test_disTypes: false });
      ClickedLinkEventTC = EventTC.discriminator(ClickedLinkEvent);
    });

    it('creating Types from models', () => {
      expect(EventTC.getFieldNames()).toEqual(['_id', 'kind', 'refId']);
      expect(ClickedLinkEventTC.getFieldNames()).toEqual(['_id', 'kind', 'refId', 'url']);
    });

    it('manually override resolver output type for findMany', async () => {
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
            kind
            refId
            url
          }
        }
      }`
      );

      expect(res.errors[0].message).toEqual('Unknown type "GenericEvent".');
      expect(res.errors[1].message).toEqual('Unknown type "ClickedLinkEvent".');
    });
  });
});
