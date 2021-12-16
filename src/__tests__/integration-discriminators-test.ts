import { graphql, schemaComposer } from 'graphql-compose/lib/index';
import { mongoose } from '../__mocks__/mongooseCommon';
import { getCharacterModels } from '../discriminators/__mocks__/characterModels';
import { composeWithMongooseDiscriminators } from '../composeWithMongooseDiscriminators';

const { CharacterModel, PersonModel, DroidModel } = getCharacterModels('type');

beforeAll(() => mongoose.createConnection());
afterAll(() => mongoose.disconnect());

describe('#78 Mongoose and Discriminators', () => {
  const options = { discriminatorKey: 'kind' };

  const eventSchema = new mongoose.Schema({ refId: String }, options);
  const Event = mongoose.model('Event', eventSchema);

  const clickedLinkSchema = new mongoose.Schema({ url: String });
  const ClickedLinkEvent = Event.discriminator('ClickedLinkEvent', clickedLinkSchema);

  const EventTC = composeWithMongooseDiscriminators(Event);
  const ClickedLinkEventTC = EventTC.discriminator(ClickedLinkEvent);

  afterAll(() => Event.deleteMany({}));

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

    schemaComposer.Query.addFields({
      eventFindMany: EventTC.getResolver('findMany'),
    });

    const schema = schemaComposer.buildSchema();

    const res = await graphql.graphql({
      schema,
      source: `{
        eventFindMany {
          __typename
          ... on Event {
            refId
          }
          ... on ClickedLinkEvent {
            kind
            refId
            url
          }
        }
      }`,
    });

    expect(res).toEqual({
      data: {
        eventFindMany: [
          { __typename: 'Event', refId: 'aaa' },
          { __typename: 'Event', refId: 'bbb' },
          { __typename: 'ClickedLinkEvent', kind: 'ClickedLinkEvent', refId: 'ccc', url: 'url1' },
          { __typename: 'ClickedLinkEvent', kind: 'ClickedLinkEvent', refId: 'ddd', url: 'url2' },
        ],
      },
    });
  });
});

describe('depicting other Enhancements to resolvers', () => {
  const CharacterDTC = composeWithMongooseDiscriminators(CharacterModel);
  const DroidCTC = CharacterDTC.discriminator(DroidModel);
  const PersonCTC = CharacterDTC.discriminator(PersonModel);

  schemaComposer.Query.addFields({
    characterById: CharacterDTC.getResolver('findById'),
    characterByIds: CharacterDTC.getResolver('findByIds'),
    characterOne: CharacterDTC.getResolver('findOne'),
    characterMany: CharacterDTC.getResolver('findMany'),
    characterCount: CharacterDTC.getResolver('count'),
    characterConnection: CharacterDTC.getResolver('connection'),
    characterPagination: CharacterDTC.getResolver('pagination'),
  });

  schemaComposer.Mutation.addFields({
    characterCreate: CharacterDTC.getResolver('createOne'),
    characterUpdateById: CharacterDTC.getResolver('updateById'),
    characterUpdateOne: CharacterDTC.getResolver('updateOne'),
    characterUpdateMany: CharacterDTC.getResolver('updateMany'),
    characterRemoveById: CharacterDTC.getResolver('removeById'),
    characterRemoveOne: CharacterDTC.getResolver('removeOne'),
    characterRemoveMany: CharacterDTC.getResolver('removeMany'),
  });

  schemaComposer.Query.addFields({
    droidById: DroidCTC.getResolver('findById'),
    droidByIds: DroidCTC.getResolver('findByIds'),
    // droidOne: DroidCTC.getResolver('findOne'),
    droidMany: DroidCTC.getResolver('findMany'),
    droidCount: DroidCTC.getResolver('count'),
    droidConnection: DroidCTC.getResolver('connection'),
    droidPagination: DroidCTC.getResolver('pagination'),
  });

  schemaComposer.Mutation.addFields({
    droidCreate: DroidCTC.getResolver('createOne'),
    droidUpdateById: DroidCTC.getResolver('updateById'),
    droidUpdateOne: DroidCTC.getResolver('updateOne'),
    droidUpdateMany: DroidCTC.getResolver('updateMany'),
    droidRemoveById: DroidCTC.getResolver('removeById'),
    droidRemoveOne: DroidCTC.getResolver('removeOne'),
    droidRemoveMany: DroidCTC.getResolver('removeMany'),
  });

  schemaComposer.Query.addFields({
    personById: PersonCTC.getResolver('findById'),
    personByIds: PersonCTC.getResolver('findByIds'),
    // personOne: PersonCTC.getResolver('findOne'),
    personMany: PersonCTC.getResolver('findMany'),
    personCount: PersonCTC.getResolver('count'),
    personConnection: PersonCTC.getResolver('connection'),
    personPagination: PersonCTC.getResolver('pagination'),
  });

  schemaComposer.Mutation.addFields({
    personCreate: PersonCTC.getResolver('createOne'),
    personUpdateById: PersonCTC.getResolver('updateById'),
    personUpdateOne: PersonCTC.getResolver('updateOne'),
    personUpdateMany: PersonCTC.getResolver('updateMany'),
    personRemoveById: PersonCTC.getResolver('removeById'),
    personRemoveOne: PersonCTC.getResolver('removeOne'),
    personRemoveMany: PersonCTC.getResolver('removeMany'),
  });

  const schema = schemaComposer.buildSchema();

  describe('baseResolvers Enhancements', () => {
    describe('createOne', () => {
      it('should create base document with DKey provided, generic fields', async () => {
        const res = await graphql.graphql({
          schema,
          source: `mutation CreateCharacters {
            droidCreate: characterCreate(record: {name: "Queue XL", type: Droid }) {
              record {
                __typename
                type
                name
              }
            }

            personCreate: characterCreate(record: {name: "mernxl", type: Person }) {
              record {
                __typename
                type
                name
              }
            }
          }`,
        });

        expect(res).toEqual({
          data: {
            droidCreate: {
              record: { __typename: 'Droid', type: 'Droid', name: 'Queue XL' },
            },
            personCreate: {
              record: { __typename: 'Person', type: 'Person', name: 'mernxl' },
            },
          },
        });
      });
    });
  });

  describe('childResolvers Enhancements', () => {
    describe('createOne', () => {
      it('should create child document without specifying DKey', async () => {
        const res = await graphql.graphql({
          schema,
          source: `mutation CreateCharacters {
            droidCreate(record: {name: "Queue XL", modelNumber: 360 }) {
              record {
                __typename
                type
                name
                modelNumber
              }
            }

            personCreate(record: {name: "mernxl", dob: 57275272}) {
              record {
                __typename
                type
                name
                dob
              }
            }
          }`,
        });

        expect(res).toEqual({
          data: {
            droidCreate: {
              record: { __typename: 'Droid', type: 'Droid', name: 'Queue XL', modelNumber: 360 },
            },
            personCreate: {
              record: { __typename: 'Person', type: 'Person', name: 'mernxl', dob: 57275272 },
            },
          },
        });
      });
    });
  });
});
