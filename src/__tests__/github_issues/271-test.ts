import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Document } from 'mongoose';
import { convertSchemaToGraphQL } from '../../../src/fieldsConverter';
const schemaComposer = new SchemaComposer<{ req: any }>();

const AuthorSchema = new mongoose.Schema(
  {
    name: { type: String },
    age: { type: Number },
    isAlive: { type: Boolean },
  },
  { _id: false }
);

const BookSchema = new mongoose.Schema({
  _id: { type: Number },
  title: { type: String, required: true },
  pageCount: { type: Number },
  author: { type: AuthorSchema },
});

interface IAuthor {
  name: string;
  age: number;
  isAlive: boolean;
}

interface IBook extends Document {
  _id: number;
  title: string;
  author: IAuthor;
  pageCount?: number;
}

const BookModel = mongoose.model<IBook>('Book', BookSchema);

convertSchemaToGraphQL(AuthorSchema, 'Author', schemaComposer);

const BookTC = composeMongoose(BookModel, { schemaComposer });

schemaComposer.Query.addFields({
  bookById: BookTC.mongooseResolvers.findById(),
  bookFindOne: BookTC.mongooseResolvers.findOne(),
  booksMany: BookTC.mongooseResolvers.findMany(),
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  mongoose.set('debug', true);
  await BookModel.base.createConnection();
  await BookModel.create({
    _id: 1,
    title: 'Atlas Shrugged',
    author: { age: new Date().getFullYear() - 1905, isAlive: false, name: 'Ayn Rand' },
    pageCount: 1168,
  });
});
afterAll(() => {
  mongoose.set('debug', false);
  BookModel.base.disconnect();
});

describe('nested projection - issue #271', () => {
  it('Happy Path', async () => {
    const result = await graphql.graphql({
      schema,
      source: `query {
          booksMany {
            title
            pageCount
            author { name }
          }
        }`,
      contextValue: {},
    });
    console.log(JSON.stringify(result));
  });

  it('Handles a Fragment', async () => {
    const result = await graphql.graphql({
      schema,
      source: `
        fragment Auth on Author {
          name
        }

        query {
          booksMany {
            title
            pageCount
            author { ...Auth }
          }
        }`,
      contextValue: {},
    });
    console.log(JSON.stringify(result));
  });
});
