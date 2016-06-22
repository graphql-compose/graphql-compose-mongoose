jest.disableAutomock();

// import findById from '../findById';
//jest.unmock('mongoose');
// jest.unmock('events');
// jest.unmock('async');
// jest.unmock('bson');
// jest.unmock('hooks-fixed');
// jest.unmock('kareem');
// jest.unmock('mongodb');
// jest.unmock('mpath');
// jest.unmock('mpromise');
// jest.unmock('mquery');
// jest.unmock('ms');
// jest.unmock('muri');
// jest.unmock('regexp-clone');
// jest.unmock('sliced');
jest.unmock('core-js/modules/_object-create');
import ocreate from 'core-js/modules/_object-create';
import mongoose from 'mongoose';
// import prepareMongo from '../../../scripts/jest-prepare-mongo';

// import doc from 'mongoose/lib/document';
// console.log(doc.prototype);

const oc = Object.create;
jest.unmock('../../__mocks__/userModel.js');
import UserModel from '../../__mocks__/userModel.js';

describe('findById()', () => {
//  prepareMongo(beforeEach, afterEach);

  beforeAll((done) => {
    mongoose.connect('mongodb://127.0.0.1:27017/gqc-mongoose-test');

    const db = mongoose.connection;

    db.on('error', (err) => {
      done.fail(err);
    });

    db.once('open', () => {
      done();
    });

  });
  /*
  beforeEach(() => {
    const schema = new mongoose.Schema({
      title:  String,
      author: String,
      body:   String,
    });
    console.log('!!!!', schema);
  });
  */


  it('should find records by id', () => {
    // console.log(mongoose);
    // const connection = mongoose.createConnection('mongodb://127.0.0.1:27017/gqc-mongoose-test');
    const schema = new mongoose.Schema({
      title:  String,
      author: String,
      body:   String,
    });
    // console.log(schema, '!!!!');

    const Um = mongoose.model('Um', schema);
    // console.log(Um);

    Object.create = ocreate;
    const u = new Um({ title: 'nod' });
    console.log(u, '!!!!!!!!!!!!!');

    Um.findOne({title: '1'}).exec((err, res) => {
      console.log(err, res);
    });

    // const u2 = new UserModel({ title: 'nod' });
    // console.log(u2, '!!!!!!!!!!!!!');

    UserModel.findOne({title: '1'}).exec((err, res) => {
      console.log(err, res);
    });
  });
});
