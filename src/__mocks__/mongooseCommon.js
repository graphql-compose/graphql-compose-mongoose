/* @flow */
/* eslint-disable no-param-reassign, no-console */

import mongoose, { Schema } from 'mongoose';
import MongodbMemoryServer from 'mongodb-memory-server';

mongoose.Promise = Promise;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

const originalConnect = mongoose.connect;
mongoose.connect = async () => {
  const mongoServer = new MongodbMemoryServer();

  const mongoUri = await mongoServer.getConnectionString();

  originalConnect.bind(mongoose)(mongoUri);

  mongoose.connection.on('error', e => {
    if (e.message.code === 'ETIMEDOUT') {
      console.error(e);
    } else {
      throw e;
    }
  });

  mongoose.connection.once('open', () => {
    // console.log(`MongoDB successfully connected to ${mongoUri}`);
  });

  mongoose.connection.once('disconnected', () => {
    // console.log('MongoDB disconnected!');
    mongoServer.stop();
  });
};

export { mongoose, Schema };
