import { SchemaComposer, graphql } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Schema } from 'mongoose';

const schemaComposer = new SchemaComposer<{ req: any }>();

// mongoose.set('debug', true);

const PrevisitSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project_id: { type: Schema.Types.ObjectId, required: true },
  },
  {
    collection: 'previsits',
  }
);
const PrevisitModel = mongoose.model<any>('Previsit', PrevisitSchema);
const PrevisitTC = composeMongoose(PrevisitModel, { schemaComposer });

const ProjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    collection: 'projects',
  }
);
const ProjectModel = mongoose.model<any>('Project', ProjectSchema);
const ProjectTC = composeMongoose(ProjectModel, { schemaComposer });

PrevisitTC.addRelation('project', {
  resolver: () => ProjectTC.mongooseResolvers.dataLoader({ lean: true }),
  prepareArgs: {
    _id: (source) => source.project_id || null,
  },
  projection: { project_id: 1 },
});

schemaComposer.Query.addFields({
  previsitMany: PrevisitTC.mongooseResolvers.findMany(),
});

const schema = schemaComposer.buildSchema();

beforeAll(async () => {
  await ProjectModel.base.createConnection();
  const projects = await ProjectModel.create([
    { name: 'Project1' },
    { name: 'Project2' },
    { name: 'Project3' },
  ]);
  await PrevisitModel.create([
    { name: 'Previsit1', project_id: projects[0] },
    { name: 'Previsit2', project_id: projects[1] },
    { name: 'Previsit3', project_id: projects[2] },
  ]);
});
afterAll(() => {
  ProjectModel.base.disconnect();
});

describe('issue #377 - Missing fields from projection in addRelation', () => {
  it('check', async () => {
    const result = await graphql.graphql({
      schema,
      contextValue: {},
      source: `
        {
          previsitMany {
            name
            project {
              name
            }
          }
        }
      `,
    });
    expect(result).toEqual({
      data: {
        previsitMany: [
          { name: 'Previsit1', project: { name: 'Project1' } },
          { name: 'Previsit2', project: { name: 'Project2' } },
          { name: 'Previsit3', project: { name: 'Project3' } },
        ],
      },
    });
  });
});
