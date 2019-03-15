/* @flow */
/* eslint-disable no-await-in-loop */

import mongoose from 'mongoose';
import MongodbMemoryServer from 'mongodb-memory-server';
import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';

let mongoServer;
beforeAll(async () => {
  mongoServer = new MongodbMemoryServer();
  const mongoUri = await mongoServer.getConnectionString();
  await mongoose.connect(mongoUri, { useNewUrlParser: true });
  // mongoose.set('debug', true);
});

afterAll(() => {
  mongoose.disconnect();
  mongoServer.stop();
});

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

describe('issue #157 - Optional enum error', () => {
  const Visit = mongoose.model(
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
