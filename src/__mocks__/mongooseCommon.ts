/* eslint-disable no-param-reassign, no-console */

import mongoose from 'mongoose';
import MongoMemoryServer from 'mongodb-memory-server-core';

const { Schema, Types } = mongoose;

mongoose.Promise = Promise;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

const originalConnect = mongoose.connect;
mongoose.createConnection = (async () => {
  const mongoServer = new MongoMemoryServer();

  const mongoUri = await mongoServer.getConnectionString(true);

  // originalConnect.bind(mongoose)(mongoUri, { useMongoClient: true }); // mongoose 4
  originalConnect.bind(mongoose)(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true }); // mongoose 5

  mongoose.connection.on('error', (e) => {
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
}) as any;

mongoose.connect = mongoose.createConnection as any;

export { mongoose, Schema, Types };
