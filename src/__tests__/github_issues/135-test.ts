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

describe('issue #135 - Mongoose virtuals', () => {
  const RecordSchema = new mongoose.Schema({ id: String, title: String });

  // ADD VIRTUAL FIELDS VIA loadClass METHOD
  // see https://mongoosejs.com/docs/api.html#schema_Schema-loadClass
  class RecordDoc {
    get virtualField123() {
      return `Improved ${(this as any).title}`;
    }
  }
  RecordSchema.loadClass(RecordDoc);

  // ADD MOCK DATA TO DB
  const Record = mongoose.model('Record', RecordSchema);
  beforeAll(async () => {
    for (let i = 1; i <= 3; i++) {
      await Record.create({ _id: `10000000000000000000000${i}`, title: `Title ${i}` });
    }
  });

  // ADD VIRTUAL FIELD DEFINITION <-------------------   JUST ADD FIELD DEFINITION 🛑🛑🛑
  // no need to define resolve method explicitly
  const RecordTC = composeWithMongoose(Record);
  RecordTC.addFields({
    virtualField123: {
      type: 'String',
    },
  });

  // INIT GRAPHQL SCHEMA
  schemaComposer.Query.addFields({
    findMany: RecordTC.getResolver('findMany'),
  });

  const schema = schemaComposer.buildSchema();

  it('check that virtual field works', async () => {
    const res = await graphql.graphql({
      schema,
      source: 'query { findMany { id title virtualField123 } }',
    });
    expect(res).toEqual({
      data: {
        findMany: [
          { id: null, title: 'Title 1', virtualField123: 'Improved Title 1' },
          { id: null, title: 'Title 2', virtualField123: 'Improved Title 2' },
          { id: null, title: 'Title 3', virtualField123: 'Improved Title 3' },
        ],
      },
    });
  });
});
