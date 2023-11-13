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
});

afterAll(() => {
  mongoose.disconnect();
  mongoServer.stop();
});

describe('issue #117', () => {
  it('`populate()` method for arrays is broken', async () => {
    const PlayerSchema = new mongoose.Schema({
      name: {
        type: String,
        required: true,
      },
      surname: {
        type: String,
        required: true,
      },
      sex: {
        type: String,
        required: true,
        enum: ['m', 'f'],
      },
    });

    const GameSchema = new mongoose.Schema({
      players: {
        required: true,
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PlayerModel',
          },
        ],
      },
    });

    const GameModel = mongoose.model('GameModel', GameSchema);
    const PlayerModel = mongoose.model('PlayerModel', PlayerSchema);

    const player1 = await PlayerModel.create({ name: '1', surname: '1', sex: 'm' });
    const player2 = await PlayerModel.create({ name: '2', surname: '2', sex: 'f' });
    const game = await GameModel.create({ players: [player1, player2] });

    const id = game._id;
    const g1 = await GameModel.findOne({ _id: id }).populate('players');
    expect(g1?.toJSON()).toEqual({
      __v: 0,
      _id: expect.anything(),
      players: [
        { __v: 0, _id: expect.anything(), name: '1', sex: 'm', surname: '1' },
        { __v: 0, _id: expect.anything(), name: '2', sex: 'f', surname: '2' },
      ],
    });

    composeWithMongoose(GameModel);
    const g2 = await GameModel.findOne({ _id: id }).populate('players');

    // WAS SUCH ERROR
    // expect(g2.toJSON()).toEqual({ __v: 0, _id: expect.anything(), players: [] });

    // EXPECTED BEHAVIOR
    expect(g2?.toJSON()).toEqual({
      __v: 0,
      _id: expect.anything(),
      players: [
        { __v: 0, _id: expect.anything(), name: '1', sex: 'm', surname: '1' },
        { __v: 0, _id: expect.anything(), name: '2', sex: 'f', surname: '2' },
      ],
    });
  });
});
