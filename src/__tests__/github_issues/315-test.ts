import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';

const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

const BookSchema = new mongoose.Schema({
  _id: { type: Number },
  title: { type: String },
  date: { type: Date },
});

const BookModel = mongoose.model<any>('Book', BookSchema);

const BookTC = composeMongoose(BookModel, { schemaComposer });
const booksFindMany = BookTC.mongooseResolvers.findMany().addFilterArg({
  name: 'from',
  type: 'Date',
  description: 'Appointment date should be after the provided date.',
  query: (rawQuery: any, value: Date) => {
    rawQuery.date = {
      $gte: value,
      ...(rawQuery.date && typeof rawQuery.date != 'object'
        ? { $eq: rawQuery.date }
        : rawQuery.date ?? {}),
    };
  },
});

schemaComposer.Query.addFields({
  booksMany: booksFindMany,
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await BookModel.base.createConnection();
  await BookModel.create({
    _id: 1,
    title: 'Atlas Shrugged',
    date: new Date('2020-01-01'),
  });
  await BookModel.create({
    _id: 2,
    title: 'Atlas Shrugged vol 2',
    date: new Date('2021-03-30'),
  });
});
afterAll(() => {
  mongoose.set('debug', false);
  BookModel.base.disconnect();
});

describe('Custom filters breaks mongo queries with 9.0.1  - issue #315', () => {
  it('check custom filter', async () => {
    const result = await graphql.graphql({
      schema,
      source: `query {
          booksMany(filter: { from: "2021-01-01T00:00:00" }) {
            title
          }
        }`,
    });
    expect(result).toEqual({
      data: {
        booksMany: [{ title: 'Atlas Shrugged vol 2' }],
      },
    });
  });
});
