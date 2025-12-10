import { SchemaComposer, dedent } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Document } from 'mongoose';
import { testFieldConfig } from '../../utils/testHelpers';

const schemaComposer = new SchemaComposer<{ req: any }>();

const UserSchema = new mongoose.Schema({
  _id: { type: Number },
  n: {
    type: String,
    alias: 'name',
    default: 'User',
  },
  age: { type: Number },
  isActive: { type: Boolean, default: false },
  analytics: {
    isEnabled: { type: Boolean, default: false },
  },
  periods: [{ from: Number, to: Number, _id: false }],
});
interface IUser extends Document<number> {
  _id: number;
  name: string;
  age?: number;
  isActive: boolean;
  analytics: {
    isEnabled: boolean;
  };
  periods: Array<{ from: number; to: number }>;
}

const UserModel = mongoose.model<IUser>('User', UserSchema);
const UserTC = composeMongoose(UserModel, { schemaComposer, defaultsAsNonNull: true });

schemaComposer.Query.addFields({
  userById: UserTC.mongooseResolvers.findById(),
});

// const schema = schemaComposer.buildSchema();
// console.log(schemaComposer.toSDL());

beforeAll(async () => {
  await UserModel.base.createConnection();
  await UserModel.create({ _id: 1 } as any);
});
afterAll(() => UserModel.base.disconnect());

describe('issue #261 - Non-nullability for mongoose fields that have a default value', () => {
  it('mongoose should hydrate doc with default values', async () => {
    const user1 = await UserModel.findById(1);
    expect(user1?.toObject({ virtuals: true })).toEqual(
      expect.objectContaining({
        _id: 1,
        name: 'User',
        isActive: false,
        analytics: { isEnabled: false },
        periods: [],
      })
    );
  });

  it('UserTC should have non-null fields if default value is provided and option `defaultsAsNonNull`', () => {
    expect(UserTC.toSDL({ deep: true, omitScalars: true })).toBe(dedent`
      type User {
        _id: Int!
        name: String!
        age: Float
        isActive: Boolean!
        analytics: UserAnalytics!
        periods: [UserPeriods]!
      }

      type UserAnalytics {
        isEnabled: Boolean!
      }

      type UserPeriods {
        from: Float
        to: Float
      }
    `);
  });

  it('UserTC should not have non-null fields which have default values', () => {
    const UserWithoutDefaultsTC = composeMongoose(UserModel, {
      schemaComposer: new SchemaComposer(),
      name: 'UserWithoutDefaults',
    });
    expect(UserWithoutDefaultsTC.toSDL({ deep: true, omitScalars: true })).toBe(dedent`
      type UserWithoutDefaults {
        _id: Int!
        name: String
        age: Float
        isActive: Boolean
        analytics: UserWithoutDefaultsAnalytics
        periods: [UserWithoutDefaultsPeriods]
      }

      type UserWithoutDefaultsAnalytics {
        isEnabled: Boolean
      }

      type UserWithoutDefaultsPeriods {
        from: Float
        to: Float
      }
    `);
  });

  it('check that graphql gets all default values', async () => {
    expect(
      await testFieldConfig({
        field: UserTC.mongooseResolvers.findById(),
        args: { _id: 1 },
        selection: `{
          _id
          name
          age
          isActive
          analytics {
            isEnabled
          }
          periods {
            from
            to
          }
        }`,
      })
    ).toEqual({
      _id: 1,
      age: null,
      analytics: { isEnabled: false },
      isActive: false,
      name: 'User',
      periods: expect.anything(),
    });
  });
});
