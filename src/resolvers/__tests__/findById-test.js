import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import findById from '../findById';
import Resolver from '../../../../graphql-compose/src/resolver/resolver';
import { GraphQLNonNull, GraphQLID } from 'graphql';

describe('findById() ->', () => {
  let user;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(done);
  });

  before('add test user document to mongoDB', (done) => {
    user = new UserModel({ name: 'nodkz' });
    user.save(done);
  });

  it('should return Resolver object', () => {
    const resolver = findById(UserModel);
    expect(resolver).to.be.instanceof(Resolver);
  });

  it('Resolver object should have non-null `id` arg', () => {
    const resolver = findById(UserModel);
    expect(resolver.hasArg('id')).to.be.true;
    const argConfig = resolver.getArg('id');
    expect(argConfig.type).to.be.instanceof(GraphQLNonNull);
    expect(argConfig.type.ofType).to.equal(GraphQLID);
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findById(UserModel).resolve();
      await expect(result).be.fulfilled;
    });

    it('should be rejected if args.id is not objectId', async () => {
      const result = findById(UserModel).resolve({ args: { id: 1 } });
      await expect(result).be.rejected;
    });

    it('should return null if args.id is empty', async () => {
      const result = await findById(UserModel).resolve();
      expect(result).equal(null);
    });

    it('should return document if provided existed id', async () => {
      const result = await findById(UserModel).resolve({ args: { id: user._id } });
      expect(result).have.property('name').that.equal(user.name);
    });
  });
});
