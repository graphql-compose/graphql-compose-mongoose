import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Document } from 'mongoose';

const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

const OrderSchema = new mongoose.Schema({
  orderStatus: String,
  inbound: {
    timeStamp: {
      type: Date,
      index: true,
    },
  },
});

interface IOrder extends Document {
  orderStatus?: string;
  inbound?: {
    timeStamp?: Date | null;
  };
}

const OrderModel = mongoose.model<IOrder>('Order', OrderSchema);
const OrderTC = composeMongoose(OrderModel, { schemaComposer });

schemaComposer.Query.addFields({
  orderMany: OrderTC.mongooseResolvers.findMany({
    suffix: 'Extended',
    filter: {
      operators: true,
    },
  }),
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await OrderModel.base.createConnection();
  await OrderModel.create([
    { orderStatus: 'PAID', inbound: { timeStamp: null } },
    { orderStatus: 'PAID', inbound: { timeStamp: 123 } },
    { orderStatus: 'UNPAID', inbound: { timeStamp: null } },
    { orderStatus: 'UNPAID', inbound: { timeStamp: 456 } },
  ]);
});
afterAll(() => {
  OrderModel.base.disconnect();
});

describe('issue #304 - Filter _operator for nested fields not apply', () => {
  it('check runtime', async () => {
    const result = await graphql.graphql({
      schema,
      source: `query {
          orderMany(filter: {
            _operators: {
              inbound: { timeStamp: { ne: null } }
              orderStatus: { ne: "PAID" }
            }
          }) {
            orderStatus
            inbound {
              timeStamp
            }
          }
        }`,
    });
    expect(result).toEqual({
      data: {
        orderMany: [{ inbound: { timeStamp: '1970-01-01T00:00:00.456Z' }, orderStatus: 'UNPAID' }],
      },
    });
  });
});
