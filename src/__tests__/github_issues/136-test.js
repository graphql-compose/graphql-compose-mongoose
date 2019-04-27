/* @flow */
/* eslint-disable no-await-in-loop */

import mongoose from 'mongoose';
import MongodbMemoryServer from 'mongodb-memory-server';
import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';

let mongoServer;
beforeAll(async () => {
  mongoServer = new MongodbMemoryServer();
  const mongoUri = await mongoServer.getConnectionString();
  await mongoose.connect(mongoUri, { useNewUrlParser: true });
  // mongoose.set('debug', true);
});

afterAll(() => {
  mongoose.disconnect();
  mongoServer.stop();
});

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

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

  CommentTC.wrapResolverAs('createManyFiltered', 'createMany', updateManyFiltered => {
    const recordsTC = CommentTC.getResolver('createMany').getArgITC('records');
    const clonedRecordTC = recordsTC.clone('createManyFilteredInput');
    clonedRecordTC.removeField('links').addFields({ hi: 'String' });
    updateManyFiltered.extendArg('records', { type: clonedRecordTC.getTypePlural() });

    return updateManyFiltered
      .wrapResolve(next => async rp => {
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
      source: 'mutation { createManyComments(records: [{ links: ["a"] }]) { createCount } }',
    });

    expect(res).toEqual({ data: { createManyComments: { createCount: 1 } } });
  });
});
