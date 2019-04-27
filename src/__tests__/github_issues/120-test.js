/* @flow */
/* eslint-disable no-await-in-loop */

import mongoose from 'mongoose';
import MongodbMemoryServer from 'mongodb-memory-server';
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

describe('issue #120 - check `connection` resolver with last/before', () => {
  const RecordSchema = new mongoose.Schema({ id: String, title: String });
  const Record = mongoose.model('Record', RecordSchema);
  const RecordTC = composeWithMongoose(Record);
  const resolver = RecordTC.getResolver('connection');

  beforeAll(async () => {
    for (let i = 1; i <= 9; i++) {
      await Record.create({ _id: `10000000000000000000000${i}`, title: `${i}` });
    }
  });

  it('check last/before with sorting', async () => {
    const res1 = await resolver.resolve({ args: { last: 2, before: '', sort: { _id: 1 } } });
    expect(res1.edges.map(({ cursor, node }) => ({ cursor, node: node.toString() }))).toEqual([
      {
        cursor: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDgifQ==',
        node: '{ _id: 100000000000000000000008 }',
      },
      {
        cursor: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDkifQ==',
        node: '{ _id: 100000000000000000000009 }',
      },
    ]);

    const res2 = await resolver.resolve({
      args: {
        last: 2,
        before: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDgifQ==',
        sort: { _id: 1 },
      },
    });
    expect(res2.edges.map(({ cursor, node }) => ({ cursor, node: node.toString() }))).toEqual([
      {
        cursor: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDYifQ==',
        node: '{ _id: 100000000000000000000006 }',
      },
      {
        cursor: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDcifQ==',
        node: '{ _id: 100000000000000000000007 }',
      },
    ]);
  });

  it('check last/before without sorting', async () => {
    const res1 = await resolver.resolve({ args: { last: 2, before: '' } });
    expect(res1.edges.map(({ cursor, node }) => ({ cursor, node: node.toString() }))).toEqual([
      { cursor: 'Nw==', node: "{ _id: 100000000000000000000008, title: '8', __v: 0 }" },
      { cursor: 'OA==', node: "{ _id: 100000000000000000000009, title: '9', __v: 0 }" },
    ]);

    const res2 = await resolver.resolve({ args: { last: 2, before: 'Nw==' } });
    expect(res2.edges.map(({ cursor, node }) => ({ cursor, node: node.toString() }))).toEqual([
      { cursor: 'NQ==', node: "{ _id: 100000000000000000000006, title: '6', __v: 0 }" },
      { cursor: 'Ng==', node: "{ _id: 100000000000000000000007, title: '7', __v: 0 }" },
    ]);
  });
});
