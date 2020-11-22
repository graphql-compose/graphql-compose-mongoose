import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Document } from 'mongoose';

const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

const AuthorSchema = new mongoose.Schema({
  name: { type: String },
  age: { type: Number },
});

interface IAuthor extends Document {
  name: string;
  age: number;
}

const AuthorModel = mongoose.model<IAuthor>('Author', AuthorSchema);
const AuthorTC = composeMongoose(AuthorModel, { schemaComposer });

schemaComposer.Query.addFields({
  authorMany: AuthorTC.mongooseResolvers.findMany().addFilterArg({
    name: 'test',
    type: 'String',
    query: (query, value) => {
      query.name = new RegExp(value, 'i');
    },
  }),
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await AuthorModel.base.createConnection();
  await AuthorModel.create({
    name: 'Ayn Rand',
    age: 115,
  });
});
afterAll(() => {
  AuthorModel.base.disconnect();
});

describe('check addFilterArg - issue #289', () => {
  it('check SDL', async () => {
    expect(schemaComposer.getITC('FilterFindManyAuthorInput').toSDL({ omitDescriptions: true }))
      .toMatchInlineSnapshot(`
      "input FilterFindManyAuthorInput {
        name: String
        age: Float
        _id: MongoID
        _operators: FilterFindManyAuthorOperatorsInput
        OR: [FilterFindManyAuthorInput!]
        AND: [FilterFindManyAuthorInput!]
        test: String
      }"
    `);
  });

  it('check runtime', async () => {
    const result = await graphql.graphql({
      schema,
      source: `query {
          authorMany(filter: { test: "ayn" }) {
            name
            age
          }
        }`,
      contextValue: {},
    });
    expect(result).toEqual({ data: { authorMany: [{ age: 115, name: 'Ayn Rand' }] } });
  });
});
