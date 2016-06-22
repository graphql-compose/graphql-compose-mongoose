import mongoose from 'mongoose';

export default function prepareMongo(beforeAll, afterAll) {
  beforeAll((done) => {
    console.log('connected to mongo');
    mongoose.connect('mongodb://127.0.0.1:27017/gqc-mongoose-test');
    const db = mongoose.connection;
    db.on('error', (err) => {
      done.fail(err);
    });

    db.once('open', () => {
      done();
    });
  });

  afterAll((done) => {
    console.log('disconnected from mongo', mongoose.connection, mongoose.connection.db);
    mongoose.connection.db.dropDatabase(() => {
      done();
    });
  });
}
