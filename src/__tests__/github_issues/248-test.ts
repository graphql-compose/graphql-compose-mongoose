import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';

let mongoServer: MongoMemoryServer;
beforeAll(async () => {
  mongoServer = new MongoMemoryServer();
  const mongoUri = await mongoServer.getConnectionString();
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  // mongoose.set('debug', true);
});

afterAll(() => {
  mongoose.disconnect();
  mongoServer.stop();
});

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

describe("issue #248 - payloads' errors", () => {
  const UserSchema = new mongoose.Schema({
    name: String,
    someStrangeField: {
      type: String,
      validate: [
        () => {
          return false;
        },
        'this is a validate message',
      ],
    },
  });

  const User = mongoose.model('User', UserSchema);
  const UserTC = composeWithMongoose(User);
  schemaComposer.Query.addFields({
    findMany: UserTC.getResolver('findMany'),
  });
  schemaComposer.Mutation.addFields({
    createOne: UserTC.getResolver('createOne'),
  });
  const schema = schemaComposer.buildSchema();

  it('catch resolver error in payload if `error` field was requested by client', async () => {
    const res = await graphql.graphql({
      schema,
      source: `
        mutation { 
          createOne(record: { name: "John", someStrangeField: "Test" }) { 
            record { 
              name
            }
            error {
              __typename
              message
              ... on ValidationError {
                path
                value
              }
            }
          }
        }
      `,
    });

    expect(res).toEqual({
      data: {
        createOne: {
          record: null,
          error: {
            __typename: 'ValidationError',
            message: 'this is a validate message',
            path: 'someStrangeField',
            value: 'Test',
          },
        },
      },
    });
  });

  it('check errors on top-level if errors field is not requested in payload', async () => {
    const res = await graphql.graphql({
      schema,
      source: `
        mutation { 
          createOne(record: { name: "John", someStrangeField: "Test" }) { 
            record { 
              name
            }
          }
        }
      `,
    });

    (res as any).errors[0] = convertToSimpleObject((res as any).errors[0]);

    expect(res).toEqual({
      data: {
        createOne: null,
      },
      errors: [
        expect.objectContaining({
          message: 'User validation failed: someStrangeField: this is a validate message',
          extensions: {
            validationErrors: {
              someStrangeField: {
                message: 'this is a validate message',
                path: 'someStrangeField',
                value: 'Test',
              },
            },
          },
          path: ['createOne'],
        }),
      ],
    });
  });
});

function convertToSimpleObject(theClass: Error): Record<string, any> {
  const keys = Object.getOwnPropertyNames(theClass);
  return keys.reduce((classAsObj, key) => {
    classAsObj[key] = (theClass as any)[key];
    return classAsObj;
  }, {} as Record<string, any>);
}
