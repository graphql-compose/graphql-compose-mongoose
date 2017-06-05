/* eslint-disable no-param-reassign, no-console */
import mongoose, { Schema } from 'mongoose';
import MongodbMemoryServer from 'mongodb-memory-server'; // eslint-disable

mongoose.Promise = Promise;

const mongoServer = new MongodbMemoryServer();

mongoServer.getConnectionString().then(mongoUri => {
  mongoose.connect(mongoUri);

  mongoose.connection.on('error', e => {
    if (e.message.code === 'ETIMEDOUT') {
      console.error(e);
      mongoose.connect(mongoUri);
    } else {
      throw e;
    }
  });

  mongoose.connection.once('open', () => {
    // console.log(`MongoDB successfully connected to ${mongoUri}`);
  });
});

export { mongoose, Schema };
