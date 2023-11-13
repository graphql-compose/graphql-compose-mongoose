/* eslint-disable no-await-in-loop */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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
    expect(
      res1.edges.map(({ cursor, node }: any) => ({ cursor, _id: node._id.toString() }))
    ).toEqual([
      {
        cursor: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDgifQ==',
        _id: '100000000000000000000008',
      },
      {
        cursor: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDkifQ==',
        _id: '100000000000000000000009',
      },
    ]);

    const res2 = await resolver.resolve({
      args: {
        last: 2,
        before: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDgifQ==',
        sort: { _id: 1 },
      },
    });
    expect(
      res2.edges.map(({ cursor, node }: any) => ({ cursor, _id: node._id.toString() }))
    ).toEqual([
      {
        cursor: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDYifQ==',
        _id: '100000000000000000000006',
      },
      {
        cursor: 'eyJfaWQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDcifQ==',
        _id: '100000000000000000000007',
      },
    ]);
  });

  it('check last/before without sorting', async () => {
    const res1 = await resolver.resolve({ args: { last: 2, before: '' } });
    expect(
      res1.edges.map(({ cursor, node }: any) => ({ cursor, _id: node._id.toString() }))
    ).toEqual([
      { cursor: 'Nw==', _id: '100000000000000000000008' },
      { cursor: 'OA==', _id: '100000000000000000000009' },
    ]);

    const res2 = await resolver.resolve({ args: { last: 2, before: 'Nw==' } });
    expect(
      res2.edges.map(({ cursor, node }: any) => ({ cursor, _id: node._id.toString() }))
    ).toEqual([
      { cursor: 'NQ==', _id: '100000000000000000000006' },
      { cursor: 'Ng==', _id: '100000000000000000000007' },
    ]);
  });
});
