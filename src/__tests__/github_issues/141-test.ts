import { SchemaComposer } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Document } from 'mongoose';
import { testFieldConfig } from '../../utils/testHelpers';

const schemaComposer = new SchemaComposer<{ req: any }>();

const UserSchema = new mongoose.Schema({
  _id: { type: Number },
  name: { type: String, required: true },
});
interface IUser extends Document {
  _id: number;
  name: string;
}

const UserModel = mongoose.model<IUser>('User', UserSchema);
const UserTC = composeMongoose(UserModel, { schemaComposer });

schemaComposer.Query.addFields({
  userById: UserTC.generateResolver.findById(),
  userFindOne: UserTC.generateResolver.findOne(),
});
schemaComposer.Mutation.addFields({
  userCreateOne: UserTC.generateResolver.createOne(),
  userUpdateById: UserTC.generateResolver.updateById(),
});

// const schema = schemaComposer.buildSchema();
// console.log(schemaComposer.toSDL());

beforeAll(async () => {
  await UserModel.base.createConnection();
  await UserModel.create({ _id: 1, name: 'User1' });
});
afterAll(() => UserModel.base.disconnect());

describe('issue #141 - createOne with custom id (not MongoId)', () => {
  it('mongoose should have doc with numeric id', async () => {
    const user1 = await UserModel.findById(1);
    expect(user1?._id).toBe(1);
    expect(user1?.name).toBe('User1');
  });

  it('UserTC should have _id with Int type', () => {
    expect(UserTC.getFieldTypeName('_id')).toBe('Int!');
  });

  it('Resolvers *ById should have Int type for args._id', () => {
    expect(UserTC.generateResolver.findById().getArgTypeName('_id')).toBe('Int!');
    expect(UserTC.generateResolver.findByIdLean().getArgTypeName('_id')).toBe('Int!');
    expect(UserTC.generateResolver.removeById().getArgTypeName('_id')).toBe('Int!');
    expect(UserTC.generateResolver.updateById().getArgTypeName('_id')).toBe('Int!');

    expect(UserTC.generateResolver.findByIds().getArgTypeName('_ids')).toBe('[Int!]!');
    expect(UserTC.generateResolver.findByIdsLean().getArgTypeName('_ids')).toBe('[Int!]!');
  });

  it('Resolvers dataLoader* should have Int type for args._id', () => {
    expect(UserTC.generateResolver.dataLoader().getArgTypeName('_id')).toBe('Int!');
    expect(UserTC.generateResolver.dataLoaderLean().getArgTypeName('_id')).toBe('Int!');
    expect(UserTC.generateResolver.dataLoaderMany().getArgTypeName('_ids')).toBe('[Int!]!');
    expect(UserTC.generateResolver.dataLoaderManyLean().getArgTypeName('_ids')).toBe('[Int!]!');
  });

  it('Check createOne/findOne resolvers', async () => {
    UserTC.generateResolver.createOne();

    expect(
      await testFieldConfig({
        field: UserTC.generateResolver.createOne({
          suffix: 'WithId',
          record: {
            removeFields: [], // <-- empty array allows to override removing _id arg
          },
        }),
        args: {
          record: { _id: 15, name: 'John' },
        },
        selection: `{
          record {
            _id
            name
          }
        }`,
      })
    ).toEqual({ record: { _id: 15, name: 'John' } });

    expect(
      await testFieldConfig({
        field: UserTC.generateResolver.findById(),
        args: {
          _id: 15,
        },
        selection: `{
          _id
          name
        }`,
      })
    ).toEqual({ _id: 15, name: 'John' });
  });

  it('Check ComplexObject as _id', async () => {
    const ComplexIdSchema = new mongoose.Schema(
      {
        region: { type: String, required: true },
        zone: String,
      },
      {
        _id: false, // disable _id field in sub-schema
      }
    );
    const ComplexSchema = new mongoose.Schema({
      _id: { type: ComplexIdSchema },
      name: { type: String, required: true },
    });
    const ComplexModel = mongoose.model('Complex', ComplexSchema);
    const ComplexTC = composeMongoose(ComplexModel);

    expect(ComplexTC.getFieldTypeName('_id')).toBe('Complex_id!');
    expect(ComplexTC.schemaComposer.getOTC('Complex_id').toSDL()).toMatchInlineSnapshot(`
      "type Complex_id {
        region: String!
        zone: String
      }"
    `);

    expect(ComplexTC.schemaComposer.getITC('Complex_idInput').toSDL()).toMatchInlineSnapshot(`
      "input Complex_idInput {
        region: String!
        zone: String
      }"
    `);
    expect(ComplexTC.generateResolver.findById().getArgTypeName('_id')).toBe('Complex_idInput!');
    expect(ComplexTC.generateResolver.findByIdLean().getArgTypeName('_id')).toBe(
      'Complex_idInput!'
    );
    expect(ComplexTC.generateResolver.removeById().getArgTypeName('_id')).toBe('Complex_idInput!');
    expect(ComplexTC.generateResolver.updateById().getArgTypeName('_id')).toBe('Complex_idInput!');
    expect(ComplexTC.generateResolver.findByIds().getArgTypeName('_ids')).toBe(
      '[Complex_idInput!]!'
    );
    expect(ComplexTC.generateResolver.findByIdsLean().getArgTypeName('_ids')).toBe(
      '[Complex_idInput!]!'
    );
    expect(ComplexTC.generateResolver.dataLoader().getArgTypeName('_id')).toBe('Complex_idInput!');
    expect(ComplexTC.generateResolver.dataLoaderLean().getArgTypeName('_id')).toBe(
      'Complex_idInput!'
    );
    expect(ComplexTC.generateResolver.dataLoaderMany().getArgTypeName('_ids')).toBe(
      '[Complex_idInput!]!'
    );
    expect(ComplexTC.generateResolver.dataLoaderManyLean().getArgTypeName('_ids')).toBe(
      '[Complex_idInput!]!'
    );

    await ComplexModel.create({
      _id: { region: 'us-west', zone: 'a' },
      name: 'Compute',
    });
    expect(
      await testFieldConfig({
        field: ComplexTC.generateResolver.findById(),
        args: { _id: { region: 'us-west', zone: 'a' } },
        selection: `{
          _id {
            region
            zone
          }
          name
        }`,
      })
    ).toEqual({ _id: { region: 'us-west', zone: 'a' }, name: 'Compute' });
  });
});
