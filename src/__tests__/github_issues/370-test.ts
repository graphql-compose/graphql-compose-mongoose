import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Schema } from 'mongoose';

const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  _organizationIds: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
  ],
});
const UserModel = mongoose.model<any>('User', UserSchema);
const UserTC = composeMongoose(UserModel, { schemaComposer });

const OrganizationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
});
const OrganizationModel = mongoose.model<any>('Organization', OrganizationSchema);
const OrganizationTC = composeMongoose(OrganizationModel, { schemaComposer });

UserTC.addRelation('organizations', {
  resolver: () => OrganizationTC.mongooseResolvers.findByIds(),
  prepareArgs: {
    _ids: (source: any) => source._organizationIds,
    skip: null,
    sort: null,
  },
  projection: { _organizationIds: 1 },
});

schemaComposer.Query.addFields({
  users: UserTC.mongooseResolvers.findMany(),
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await OrganizationModel.base.createConnection();
  const orgs = await OrganizationModel.create([
    { title: 'Org1' },
    { title: 'Org2' },
    { title: 'Org3' },
  ]);
  await UserModel.create([
    { firstName: 'User1', _organizationIds: [orgs[0]._id, orgs[1]._id] },
    { firstName: 'User2', _organizationIds: [orgs[2]._id] },
  ]);
});
afterAll(() => {
  OrganizationModel.base.disconnect();
});

describe('issue #370 - addRelation: projection not working as expected ', () => {
  it('check', async () => {
    const result = await graphql.graphql({
      schema,
      source: `query {
          users(sort: _ID_ASC) {
            firstName
            organizations {
              title
            }
          }
        }`,
    });
    expect(result).toEqual({
      data: {
        users: [
          { firstName: 'User1', organizations: [{ title: 'Org1' }, { title: 'Org2' }] },
          { firstName: 'User2', organizations: [{ title: 'Org3' }] },
        ],
      },
    });
  });
});
