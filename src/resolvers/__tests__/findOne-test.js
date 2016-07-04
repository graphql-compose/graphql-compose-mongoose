/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import findOne from '../findOne';
import { Resolver } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql';
import { mongooseModelToTypeComposer } from '../../modelConverter';

const UserTypeComposer = mongooseModelToTypeComposer(UserModel);

describe('findOne() ->', () => {
  let user1;
  let user2;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(() => {
      done();
    });
  });

  before('add test user document to mongoDB', () => {
    user1 = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
    });

    user2 = new UserModel({
      name: 'userName2',
      skills: ['go', 'erlang'],
      gender: 'female',
      relocation: false,
    });

    return Promise.all([
      user1.save(),
      user2.save(),
    ]);
  });

  it('should return Resolver object', () => {
    const resolver = findOne(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = findOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('filter')).to.be.true;
    });

    it('should have `filter` arg only with indexed fields', async () => {
      const result = findOne(UserModel, UserTypeComposer, { filter: { onlyIndexed: true } });
      const filterFields = result.args.filter.type._typeConfig.fields();
      expect(filterFields).all.keys(['_id', 'name', 'employment']);
    });

    it('should have `filter` arg with required `name` field', async () => {
      const result = findOne(UserModel, UserTypeComposer, { filter: { requiredFields: 'name' } });
      const filterFields = result.args.filter.type._typeConfig.fields();
      expect(filterFields).deep.property('name.type').instanceof(GraphQLNonNull);
    });

    it('should have `skip` arg', () => {
      const resolver = findOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('skip')).to.be.true;
    });

    it('should have `sort` arg', () => {
      const resolver = findOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('sort')).to.be.true;
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be fulfilled promise', async () => {
      const result = findOne(UserModel, UserTypeComposer).resolve({});
      await expect(result).be.fulfilled;
    });

    it('should return one document if args is empty', async () => {
      const result = await findOne(UserModel, UserTypeComposer).resolve({ args: {} });
      expect(result).is.a('object');
      expect(result).have.property('name').that.oneOf([user1.name, user2.name]);
    });

    it('should return document if provided existed id', async () => {
      const result = await findOne(UserModel, UserTypeComposer)
        .resolve({ args: { id: user1._id } });
      expect(result).have.property('name').that.equal(user1.name);
    });

    it('should skip records', async () => {
      const result = await findOne(UserModel, UserTypeComposer).resolve({ args: { skip: 2000 } });
      expect(result).to.be.null;
    });

    it('should sort records', async () => {
      const result1 = await findOne(UserModel, UserTypeComposer)
        .resolve({ args: { sort: { _id: 1 } } });

      const result2 = await findOne(UserModel, UserTypeComposer)
        .resolve({ args: { sort: { _id: -1 } } });

      expect(`${result1._id}`).not.equal(`${result2._id}`);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should return model type', () => {
      const outputType = findOne(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).to.equal(UserTypeComposer.getType());
    });
  });
});
