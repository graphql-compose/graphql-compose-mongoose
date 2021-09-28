import { SchemaComposer, graphql, EnumTypeComposer } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Schema } from 'mongoose';

const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

const ArticleSchema = new Schema(
  {
    name: {
      type: String,
      index: true,
    },
    label: {
      type: String,
      enum: ['', null, 'val1'],
    },
  },
  {
    collection: 'article',
  }
);
const ArticleModel = mongoose.model<any>('Article', ArticleSchema);
const ArticleTC = composeMongoose(ArticleModel, { schemaComposer });

let lastResolverInputArg = [] as any;
const enumTC = ArticleTC.getFieldTC('label') as EnumTypeComposer;
schemaComposer.Query.addFields({
  articles: ArticleTC.mongooseResolvers.findMany(),
  test: {
    type: enumTC.List,
    args: { input: enumTC.List },
    resolve: (_, { input }) => {
      lastResolverInputArg = [...input];
      return input;
    },
  },
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await ArticleModel.base.createConnection();
  await ArticleModel.create([
    { name: 'A1', label: null },
    { name: 'A2', label: '' },
    { name: 'A3', label: 'val1' },
  ]);
});
afterAll(() => {
  ArticleModel.base.disconnect();
});

describe('issue #384 - New feature Request: To allow null, string in Enum', () => {
  it('check SDL', async () => {
    expect(ArticleTC.toSDL({ omitDescriptions: true, deep: true, omitScalars: true }))
      .toMatchInlineSnapshot(`
"type Article {
  name: String
  label: EnumArticleLabel
  _id: MongoID!
}

enum EnumArticleLabel {
  EMPTY_STRING
  NULL
  val1
}"
`);
  });

  it('check runtime output', async () => {
    const result = await graphql.graphql({
      schema,
      contextValue: {},
      source: `
        {
          articles(sort: NAME_ASC) {
            name
            label
          }
        }
      `,
    });
    expect(result).toEqual({
      data: {
        articles: [
          { label: null, name: 'A1' }, // <-- special `null` case. It cannot be converted to NULL string
          { label: 'EMPTY_STRING', name: 'A2' }, // <-- has correct ENUM key
          { label: 'val1', name: 'A3' },
        ],
      },
    });
  });

  it('check runtime input', async () => {
    const result = await graphql.graphql({
      schema,
      contextValue: {},
      source: `
        {
          test(input: [val1, NULL, EMPTY_STRING]) 
        }
      `,
    });

    // inside resolvers should be provided real values for null & string
    expect(lastResolverInputArg).toEqual(['val1', null, '']);

    // in output JSON should be provided keys
    // BUT be aware `null` does not converted back to `NULL` string
    expect(result).toEqual({ data: { test: ['val1', null, 'EMPTY_STRING'] } });
  });
});
