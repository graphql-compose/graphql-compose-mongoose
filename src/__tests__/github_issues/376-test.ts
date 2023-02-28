import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Schema } from 'mongoose';

const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

export interface Profile {
  _id: string;
  emailAddress: string;
  name: string;
}

type ProfileDocType = Profile & mongoose.Document;
const ProfileSchema = new Schema<ProfileDocType>(
  {
    _id: {
      type: String,
      required: true,
    },
    emailAddress: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  }
);
const ProfileModel = mongoose.model<ProfileDocType>('Profile', ProfileSchema);
composeMongoose<ProfileDocType>(ProfileModel, { schemaComposer });

const PublicProfileTC = composeMongoose<ProfileDocType>(ProfileModel, {
  name: "PublicProfile",
  onlyFields: ["_id", "name"],
  schemaComposer
});

interface Org {
  _id: string;
  name: string;
  ownerId?: string;
}

type OrgDocType = Org & mongoose.Document;
const OrgSchema = new Schema<OrgDocType>(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    ownerId: String,
  },
);
const OrgModel = mongoose.model<OrgDocType>('Org', OrgSchema);
const OrgTC = composeMongoose<OrgDocType>(OrgModel, { schemaComposer });

OrgTC.addRelation('owner', {
  resolver: () => PublicProfileTC.mongooseResolvers.findById({ lean: true }),
  prepareArgs: {
    // Define the args passed to the resolver (eg what the _id value should be)
    // Source is the filter passed to the user query
    _id: (org) => {
      // console.log(org);
      return org.ownerId;
    },
  },
  projection: { ownerId: 1 }, // Additional fields from UserSchema we need to pass to the Org resolver
});

schemaComposer.Query.addFields({
  orgFindOne: OrgTC.mongooseResolvers.findOne({
    lean: true,
    filter: {
      onlyIndexed: true,
    },
  }),
  orgs: OrgTC.mongooseResolvers.findMany(),
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await OrgModel.base.createConnection();
  const profiles = [
    { _id: "1", emailAddress: "user1@example.com", name: 'User1' },
    { _id: "2", emailAddress: "user2@example.com", name: 'User2' },
  ];
  await ProfileModel.create(profiles);
  await OrgModel.create([
    { _id: "1", name: 'Organization1' },
    { _id: "2", name: 'Organization2', ownerId: profiles[0]._id },
    { _id: "3", name: 'Organization3', ownerId: profiles[1]._id },
  ]);
});
afterAll(() => {
  OrgModel.base.disconnect();
});

describe('issue #376 - Projection not being added to query in relation with findOne', () => {
  it('check', async () => {
    const result = await graphql.graphql({
      schema,
      source: `query($filter: FilterFindOneOrgInput) {
          orgFindOne(filter: $filter) {
            name
            owner {
              name
            }
          }
        }`,
      variableValues: {
        _id: "2",
      },
    });
    expect(result).toEqual({
      data: {
        orgFindOne:
          { name: 'Organization2', owner: { name: 'User1' } },
      },
    });
  });
});

describe('issue #376 - Projection IS added to query in relation with findMany', () => {
  it('check', async () => {
    const result = await graphql.graphql({
      schema,
      source: `query {
          orgs {
            name
            owner {
              name
            }
          }
        }`,
    });
    expect(result).toEqual({
      data: {
        orgs: [
          { name: 'Organization1', owner: null },
          { name: 'Organization2', owner: { name: 'User1' } },
          { name: 'Organization3', owner: { name: 'User2' } },
        ],
      },
    });
  });
});
