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

describe('issue #128 - OR/AND filter args not working with some other filter args', () => {
  const RecordSchema = new mongoose.Schema({
    id: String,
    name: String,
    pets: [String],
    friends: [String],
  });
  const Record = mongoose.model('Record', RecordSchema);
  const RecordTC = composeWithMongoose(Record);
  const resolver = RecordTC.getResolver('findMany');

  beforeAll(async () => {
    for (let i = 1; i <= 9; i++) {
      await Record.create({
        _id: `10000000000000000000000${i}`,
        name: `Name ${i}`,
        pets: [`Pet ${i}`],
        friends: [`Friend ${i}`],
      });
    }
  });

  it('check with OR filter arg', async () => {
    const res1 = await resolver.resolve({
      args: {
        filter: {
          OR: [
            { _operators: { pets: { in: ['Pet 2'] } } },
            { _operators: { friends: { in: ['Friend 4'] } } },
          ],
        },
      },
    });

    expect(
      res1.map(({ pets, friends }: any) => ({ pets: [...pets], friends: [...friends] }))
    ).toEqual([
      {
        pets: ['Pet 2'],
        friends: ['Friend 2'],
      },
      {
        pets: ['Pet 4'],
        friends: ['Friend 4'],
      },
    ]);
  });

  it('check with AND filter arg', async () => {
    const res1 = await resolver.resolve({
      args: {
        filter: {
          OR: [{ _operators: { pets: { in: ['Pet 2'] } } }, { name: 'Name 4' }],
        },
      },
    });

    expect(
      res1.map(({ pets, friends }: any) => ({ pets: [...pets], friends: [...friends] }))
    ).toEqual([
      {
        pets: ['Pet 2'],
        friends: ['Friend 2'],
      },
      {
        pets: ['Pet 4'],
        friends: ['Friend 4'],
      },
    ]);
  });

  it('check without OR filter arg', async () => {
    const res1 = await resolver.resolve({
      args: {
        filter: {
          _operators: { pets: { in: ['Pet 2'] } },
        },
      },
    });

    expect(res1.map((res: any) => ({ pets: [...res.pets], friends: [...res.friends] }))).toEqual([
      {
        pets: ['Pet 2'],
        friends: ['Friend 2'],
      },
    ]);
  });
});
