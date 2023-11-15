/* eslint-disable no-await-in-loop */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';
import { getPortFree } from '../../__mocks__/mongooseCommon';

let mongoServer: MongoMemoryServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      port: await getPortFree(),
    },
  });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(
    mongoUri,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as any /* for tests compatibility with mongoose v5 & v6 */
  );
  // mongoose.set('debug', true);
});

afterAll(() => {
  mongoose.disconnect();
  mongoServer.stop();
});

describe('issue #194 - useAlias', () => {
  const UserSchema = new mongoose.Schema({
    e: {
      type: String,
      alias: 'emailAddress',
    },
  });

  const User = mongoose.model('User', UserSchema);
  const UserTC = composeWithMongoose(User);

  it('check that virtual field works', async () => {
    // INIT GRAPHQL SCHEMA
    schemaComposer.Query.addFields({ findMany: UserTC.getResolver('findMany') });
    schemaComposer.Mutation.addFields({
      createOne: UserTC.getResolver('createOne'),
    });
    const schema = schemaComposer.buildSchema();

    const res = await graphql.graphql({
      schema,
      source:
        'mutation { createOne(record: { emailAddress: "a@a.com" }) { record { emailAddress } } }',
    });
    expect(res).toEqual({ data: { createOne: { record: { emailAddress: 'a@a.com' } } } });

    const res2 = await graphql.graphql({
      schema,
      source: 'query { findMany { emailAddress } }',
    });
    expect(res2).toEqual({ data: { findMany: [{ emailAddress: 'a@a.com' }] } });
  });
});
