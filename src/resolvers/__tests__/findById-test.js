import { expect } from 'chai';
import mongoose from 'mongoose';
import UserModel from '../../__mocks__/userModel.js';
import findById from '../findById';
import Resolver from '../../../../graphql-compose/src/resolver/resolver';
import { GraphQLNonNull, GraphQLID } from 'graphql';

describe('findById()', () => {
  let user;

  before('prepare mongodb with fresh data', (done) => {
    mongoose.connect('mongodb://127.0.0.1:27017/gqc-mongoose-test');

    mongoose.connection.on('error', (err) => {
      throw new Error(err);
    });

    mongoose.connection.once('open', async () => {
      await UserModel.collection.drop();

      user = new UserModel({ name: 'nodkz' });
      await user.save();

      done();
    });
  });

  it('should return Resolver', () => {
    const resolver = findById(UserModel);
    expect(resolver).to.be.instanceof(Resolver);
  });

  it('should provide Promise for Resolver.resolve() if args.id is provided', () => {
    const resolver = findById(UserModel);
    expect(resolver.resolve({ args: { id: 1 } })).to.be.instanceof(mongoose.Promise);
  });

  it('should provide `null` for Resolver.resolve() if args.id is empty', () => {
    const resolver = findById(UserModel);
    expect(resolver.resolve()).to.be.null;
  });

  it('should have non-null `id` arg', () => {
    const resolver = findById(UserModel);
    expect(resolver.hasArg('id')).to.be.true;
    const argConfig = resolver.getArg('id');
    expect(argConfig.type).to.be.instanceof(GraphQLNonNull);
    expect(argConfig.type.ofType).to.equal(GraphQLID);
  });

  it('should find record by id', (done) => {
    const resolver = findById(UserModel);
    resolver.resolve({ args: { id: user._id } }).then(res => {
      expect(res).to.be.ok;
      expect(res.name).to.equal(user.name);
    })
    .then(() => done())
    .catch(err => { throw new Error(err); });
  });
});
