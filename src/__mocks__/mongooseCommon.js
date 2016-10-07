import mongoose, { Schema } from 'mongoose';

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

const dbName = `gqc-mongoose-test${getRandomInt(1, 1000000)}`;
const uri = `mongodb://127.0.0.1:27017/${dbName}`;

mongoose.Promise = Promise;
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

process.on('exit', () => { dropDBs(); });
process.on('uncaughtException', () => { dropDBs(); });
process.on('SIGINT', () => { dropDBs(); });

export {
  mongoose,
  Schema,
  dropDBs,
  uri,
  dbName,
};
