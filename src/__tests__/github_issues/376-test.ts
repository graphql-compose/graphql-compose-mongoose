import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Schema } from 'mongoose';

const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Org',
      required: true,
      set: function (this: any, newOrgId: any) {
        // temporarily store previous org so
        // assignment to new org will work.
        this._prevOrg = this.orgId;
        return newOrgId;
      },
    },
  },
  {
    collection: 'users',
    timestamps: {
      createdAt: 'created',
      updatedAt: 'modified',
    },
  }
);
const UserModel = mongoose.model<any>('User', UserSchema);
const UserTC = composeMongoose(UserModel, { schemaComposer });

const OrgSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    Users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    collection: 'orgs',
    timestamps: {
      createdAt: 'created',
      updatedAt: 'modified',
    },
  }
);
const OrgModel = mongoose.model<any>('Org', OrgSchema);
const OrgTC = composeMongoose(OrgModel, { schemaComposer });

UserTC.addRelation('org', {
  resolver: () => OrgTC.mongooseResolvers.findById(),
  prepareArgs: {
    // Define the args passed to the resolver (eg what the _id value should be)
    // Source is the filter passed to the user query
    _id: (source) => {
      // console.log(source);
      return source.orgId;
    },
  },
  projection: { orgId: true }, // Additional fields from UserSchema we need to pass to the Org resolver
});

schemaComposer.Query.addFields({
  users: UserTC.mongooseResolvers.findMany(),
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await OrgModel.base.createConnection();
  const orgs = await OrgModel.create([
    { name: 'Organization1' },
    { name: 'Organization2' },
    { name: 'Organization3' },
  ]);
  await UserModel.create([
    { name: 'User1', orgId: orgs[1]._id },
    { name: 'User2', orgId: orgs[2]._id },
  ]);
});
afterAll(() => {
  OrgModel.base.disconnect();
});

describe('issue #376 - Projection not being added to query in relation', () => {
  it('check', async () => {
    const result = await graphql.graphql({
      schema,
      source: `query {
          users(sort: _ID_ASC) {
            name
            org {
              name
            }
          }
        }`,
    });
    expect(result).toEqual({
      data: {
        users: [
          { name: 'User1', org: { name: 'Organization2' } },
          { name: 'User2', org: { name: 'Organization3' } },
        ],
      },
    });
  });
});
