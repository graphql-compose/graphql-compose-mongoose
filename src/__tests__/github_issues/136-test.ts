/* eslint-disable no-await-in-loop */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { schemaComposer, graphql } from 'graphql-compose';
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

describe('issue #136 - Mongoose virtuals', () => {
  const CommentSchema = new mongoose.Schema({
    author: {
      type: mongoose.Schema.Types.ObjectId,
      rel: 'Autor',
    },
    links: [String],
  });

  const Comment = mongoose.model('Comment', CommentSchema);
  const CommentTC = composeWithMongoose(Comment);

  CommentTC.wrapResolverAs('createManyFiltered', 'createMany', (updateManyFiltered) => {
    const recordsTC = CommentTC.getResolver('createMany').getArgITC('records');
    const clonedRecordTC = recordsTC.clone('createManyFilteredInput');
    clonedRecordTC.removeField('links').addFields({ hi: 'String' });
    updateManyFiltered.extendArg('records', { type: clonedRecordTC.List });

    return updateManyFiltered
      .wrapResolve((next) => async (rp) => {
        console.log(rp.args); // eslint-disable-line
        return next(rp);
      })
      .debug();
  });

  it('check that virtual field works', async () => {
    // INIT GRAPHQL SCHEMA
    schemaComposer.Query.addFields({ noop: 'String' });
    schemaComposer.Mutation.addFields({
      createCommentsFiltered: CommentTC.getResolver('createManyFiltered'),
      createManyComments: CommentTC.getResolver('createMany'),
    });
    const schema = schemaComposer.buildSchema();

    const res = await graphql.graphql({
      schema,
      source: 'mutation { createManyComments(records: [{ links: ["a"] }]) { createdCount } }',
    });

    expect(res).toEqual({ data: { createManyComments: { createdCount: 1 } } });
  });
});
