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

describe('issue #157 - Optional enum error', () => {
  const Visit = mongoose.model<any>(
    'visit',
    new mongoose.Schema({
      url: { type: String, required: true },
      referredBy: { type: String, enum: ['WEBSITE', 'NEWSPAPER'] },
    })
  );

  it('check ', async () => {
    const VisitTC = composeWithMongoose(Visit);

    const referredBy: any = VisitTC.getFieldType('referredBy');
    expect(referredBy).toBeInstanceOf(graphql.GraphQLEnumType);
    const etc = schemaComposer.createEnumTC(referredBy);
    expect(etc.getFieldNames()).toEqual(['WEBSITE', 'NEWSPAPER']);

    etc.addFields({
      EMPTY_STRING: { value: '' },
      NULL: { value: null },
    });
    expect(etc.getFieldNames()).toEqual(['WEBSITE', 'NEWSPAPER', 'EMPTY_STRING', 'NULL']);
  });
});
