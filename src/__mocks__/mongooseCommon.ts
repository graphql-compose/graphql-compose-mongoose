/* eslint-disable no-param-reassign, no-console */

import mongoose from 'mongoose';
import MongoMemoryServer from 'mongodb-memory-server-core';
import net, { AddressInfo } from 'net';

const { Schema, Types } = mongoose;

mongoose.Promise = Promise;

export async function getPortFree() {
  return new Promise<number>((res) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close(() => res(port));
    });
  });
}

const originalConnect = mongoose.connect;
mongoose.createConnection = (async () => {
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      port: await getPortFree(),
    },
  });
  const mongoUri = mongoServer.getUri();

  originalConnect.bind(mongoose)(mongoUri, {});

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
