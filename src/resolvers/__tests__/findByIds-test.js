import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import findByIds from '../findByIds';
import Resolver from '../../../../graphql-compose/src/resolver/resolver';
import { GraphQLNonNull, GraphQLID, GraphQLList } from 'graphql';

describe('findByIds() ->', () => {
  let user1;
  let user2;
  let user3;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(done);
  });

  before('add test users documents to mongoDB', (done) => {
    user1 = new UserModel({ name: 'nodkz1' });
    user2 = new UserModel({ name: 'nodkz2' });
    user3 = new UserModel({ name: 'nodkz3' });

    Promise.all([
      user1.save(),
      user2.save(),
      user3.save(),
    ]).then(() => done());
  });

  it('should return Resolver object', () => {
    const resolver = findByIds(UserModel);
    expect(resolver).to.be.instanceof(Resolver);
  });

  it('should have non-null `ids` arg', () => {
    const resolver = findByIds(UserModel);
    expect(resolver.hasArg('ids')).to.be.true;
    const argConfig = resolver.getArg('ids');
    expect(argConfig.type).to.be.instanceof(GraphQLNonNull);
    expect(argConfig.type.ofType).to.be.instanceof(GraphQLList);
    expect(argConfig.type.ofType.ofType).to.equal(GraphQLID);
  });

  it('Resolver object should have `limit` arg', () => {
    const resolver = findByIds(UserModel);
    expect(resolver.hasArg('limit')).to.be.true;
  });

  it('Resolver object should have `sort` arg', () => {
    const resolver = findByIds(UserModel);
    expect(resolver.hasArg('sort')).to.be.true;
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findByIds(UserModel).resolve();
      await expect(result).be.fulfilled;
    });

    it('should return empty array if args.ids is empty', async () => {
      const result = await findByIds(UserModel).resolve();
      expect(result).to.be.instanceOf(Array);
      expect(result).to.be.empty;
    });

    it('should return empty array if args.ids is not valid objectIds', async () => {
      const result = await findByIds(UserModel).resolve({ args: { ids: ['d', 'e'] } });
      expect(result).to.be.instanceOf(Array);
      expect(result).to.be.empty;
    });

    it('should return array of documents', async () => {
      const result = await findByIds(UserModel)
        .resolve({ args: { ids: [user1._id, user2._id, user3._id] } });

      expect(result).to.be.instanceOf(Array);
      expect(result).to.have.lengthOf(3);
      expect(result.map(d => d.name))
        .to.have.members([user1.name, user2.name, user3.name]);
    });

    it('should return array of documents if object id is string', async () => {
      const stringId = `${user1._id}`;
      const result = await findByIds(UserModel)
        .resolve({ args: { ids: [stringId] } });

      expect(result).to.be.instanceOf(Array);
      expect(result).to.have.lengthOf(1);
    });
  });
});
