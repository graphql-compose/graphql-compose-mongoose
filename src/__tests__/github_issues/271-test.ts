import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Document } from 'mongoose';
import { convertSchemaToGraphQL } from '../../../src/fieldsConverter';
const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

const AuthorSchema = new mongoose.Schema(
  {
    name: { type: String },
    ag: { type: Number, alias: 'age' },
    isAlive: { type: Boolean },
  },
  { _id: false }
);

const BookSchema = new mongoose.Schema({
  _id: { type: Number },
  title: { type: String, required: true },
  pc: { type: Number, alias: 'pageCount' },
  a: { type: AuthorSchema, alias: 'author' },
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

const AuthorTC = convertSchemaToGraphQL(AuthorSchema, 'Author', schemaComposer);
AuthorTC.setField('isAbove100', {
  type: 'String',
  resolve: (s: IAuthor) => {
    return !s?.age ? 'unknown' : s.age > 100 ? 'yes' : 'no';
  },
  projection: { age: true },
});

const BookTC = composeMongoose(BookModel, { schemaComposer });
BookTC.setField('bookSize', {
  type: 'String',
  resolve: (s: IBook) => {
    return !s?.pageCount ? 'unknown' : s.pageCount > 500 ? 'big' : 'small';
  },
  projection: { pageCount: true },
});

let lastExecutedProjection: Record<string, true>;
schemaComposer.Query.addFields({
  booksMany: BookTC.mongooseResolvers.findMany().wrapResolve((next) => async (rp) => {
    const res = await next(rp);
    lastExecutedProjection = rp.query._fields;
    return res;
  }),
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await BookModel.base.createConnection();
  await BookModel.create({
    _id: 1,
    title: 'Atlas Shrugged',
    author: {
      age: 115,
      isAlive: false,
      name: 'Ayn Rand',
    },
    pageCount: 1168,
  });
});
afterAll(() => {
  mongoose.set('debug', false);
  BookModel.base.disconnect();
});

describe('nested projections with aliases - issue #271', () => {
  it('check mongoose itself', async () => {
    const book = (
      await BookModel.find({}).select({
        bookSize: true,
        'a.isAbove100': true,
        'a.ag': true,
        pc: true,
      })
    )[0];
    expect(book?.pageCount).toEqual(1168);
    expect(book?.author?.age).toEqual(115);
    expect(book?.toObject({ virtuals: true })).toEqual({
      _id: 1,
      a: expect.objectContaining({ ag: 115, age: 115 }),
      author: expect.objectContaining({ ag: 115, age: 115 }),
      id: '1',
      pageCount: 1168,
      pc: 1168,
    });
  });

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
    expect(lastExecutedProjection).toEqual({ 'a.name': true, pc: true, title: true });
    expect(result).toEqual({
      data: {
        booksMany: [{ author: { name: 'Ayn Rand' }, pageCount: 1168, title: 'Atlas Shrugged' }],
      },
    });
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
            author { ...Auth }
          }
        }`,
      contextValue: {},
    });
    expect(lastExecutedProjection).toEqual({ 'a.name': true, title: true });
    expect(result).toEqual({
      data: {
        booksMany: [{ author: { name: 'Ayn Rand' }, title: 'Atlas Shrugged' }],
      },
    });
  });

  it('Handles computable fields which uses `projection` property', async () => {
    const result = await graphql.graphql({
      schema,
      source: `
        query {
          booksMany {
            bookSize
            author { 
              isAbove100
            }
          }
        }`,
      contextValue: {},
    });
    expect(lastExecutedProjection).toEqual({
      bookSize: true,
      'a.isAbove100': true,
      'a.ag': true,
      pc: true,
    });
    expect(result).toEqual({
      data: { booksMany: [{ author: { isAbove100: 'yes' }, bookSize: 'big' }] },
    });
  });

  it('check filter with alias', async () => {
    // firstly check mongoose query
    expect(await BookModel.find({ pc: 1168 }).lean()).toEqual([
      {
        __v: 0,
        _id: 1,
        a: { ag: 115, isAlive: false, name: 'Ayn Rand' },
        pc: 1168,
        title: 'Atlas Shrugged',
      },
    ]);

    // check that aliases correctly applied to filter
    const result = await graphql.graphql({
      schema,
      source: `
        query {
          booksMany(filter: { pageCount: 1168 }) {
            title
            pageCount
          }
        }`,
      contextValue: {},
    });
    expect(result).toEqual({ data: { booksMany: [{ pageCount: 1168, title: 'Atlas Shrugged' }] } });
  });

  it('check nested filter with alias', async () => {
    // firstly check mongoose query
    expect(await BookModel.find({ 'a.ag': 115 }).lean()).toEqual([
      {
        __v: 0,
        _id: 1,
        a: { ag: 115, isAlive: false, name: 'Ayn Rand' },
        pc: 1168,
        title: 'Atlas Shrugged',
      },
    ]);

    const result = await graphql.graphql({
      schema,
      source: `
        query {
          booksMany(filter: { author: { age: 115 } }) {
            title
            pageCount
          }
        }`,
      contextValue: {},
    });
    expect(result).toEqual({ data: { booksMany: [{ pageCount: 1168, title: 'Atlas Shrugged' }] } });
  });
});
