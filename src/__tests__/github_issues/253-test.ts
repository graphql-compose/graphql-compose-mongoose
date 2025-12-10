import { schemaComposer } from 'graphql-compose';
import { composeWithMongooseDiscriminators } from '../../index';
import { mongoose, Schema } from '../../__mocks__/mongooseCommon';
import { testFieldConfig } from '../../utils/testHelpers';

const SubCarSchema = new Schema({ s: { type: Number, required: true, alias: 'speed' } });

const CarSchema = new Schema(
  { s: { type: Number, required: true, alias: 'speed' }, aaa: SubCarSchema },
  { discriminatorKey: 't' }
);
const Car = mongoose.model('Car', CarSchema);

const TimeMachineSchema = new Schema(
  { f: { type: Number, required: true, alias: 'fluxCompensatorVersion' } },
  { discriminatorKey: 't' }
);
const TimeMachine = Car.discriminator('TimeMachine', TimeMachineSchema);

const CarDTC = composeWithMongooseDiscriminators(Car);

schemaComposer.Query.addFields({
  allCars: CarDTC.getResolver('findMany'),
  timeMachines: CarDTC.discriminator(TimeMachine).getResolver('findMany'),
});

// console.log(schemaComposer.toSDL({ omitDescriptions: true }));

beforeAll(async () => {
  await mongoose.createConnection();
  // todo find away to get the alias types?
  await TimeMachine.create({ speed: 300, fluxCompensatorVersion: 5 });
});
afterAll(() => mongoose.disconnect());

describe('issue #253 - Consider aliases from discriminators during preparation', () => {
  it('check data in db', async () => {
    const data = await Car.find({}).lean();
    expect(data).toEqual([{ __v: 0, _id: expect.anything(), f: 5, s: 300, t: 'TimeMachine' }]);
  });

  it('check query', async () => {
    const res = await testFieldConfig({
      field: CarDTC.getResolver('findMany'),
      selection: `{
        __typename
        speed
        ... on TimeMachine {
          fluxCompensatorVersion
        }
      }`,
      schemaComposer,
    });
    expect(res).toEqual([
      {
        __typename: 'TimeMachine',
        fluxCompensatorVersion: 5,
        speed: 300,
      },
    ]);
  });
});
