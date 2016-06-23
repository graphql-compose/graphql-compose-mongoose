import mongoose, { Schema } from 'mongoose';

const dbName = 'gqc-mongoose-test';
const uri = `mongodb://127.0.0.1:27017/${dbName}`;

mongoose.connect(uri);

mongoose.connection.on('error', (err) => {
  throw new Error(err);
});


function dropDBs(done) {
  mongoose.connection.db.dropDatabase(() => {
    if (done) {
      done();
    }
  });
}

export {
  mongoose,
  Schema,
  dropDBs,
  uri,
  dbName,
};
