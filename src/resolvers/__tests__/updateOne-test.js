/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import updateOne from '../updateOne';
import Resolver from '../../../../graphql-compose/src/resolver/resolver';
import { GraphQLObjectType } from 'graphql';
import { convertModelToGraphQL } from '../../fieldsConverter';

const UserType = convertModelToGraphQL(UserModel, 'User');

describe('updateOne() ->', () => {
  let user1;
  let user2;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(done);
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
    const resolver = updateOne(UserModel, UserType);
    expect(resolver).to.be.instanceof(Resolver);
  });

  it('Resolver object should have `filter` arg', () => {
    const resolver = updateOne(UserModel, UserType);
    expect(resolver.hasArg('filter')).to.be.true;
  });

  it('Resolver object should have `skip` arg', () => {
    const resolver = updateOne(UserModel, UserType);
    expect(resolver.hasArg('skip')).to.be.true;
  });

  it('Resolver object should have `sort` arg', () => {
    const resolver = updateOne(UserModel, UserType);
    expect(resolver.hasArg('sort')).to.be.true;
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateOne(UserModel, UserType).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = updateOne(UserModel, UserType).resolve({ args: {} });
      await expect(result).be.rejectedWith(Error, 'at least one value in args.filter');
    });

    it('should return recordId', async () => {
      const result = await updateOne(UserModel, UserType).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result).have.property('recordId', user1.id);
    });

    it('should change data via args.input in model', async () => {
      const result = await updateOne(UserModel, UserType).resolve({
        args: {
          filter: { _id: user1.id },
          input: { name: 'newName' },
        },
      });
      expect(result).have.deep.property('record.name', 'newName');
    });

    it('should change data via args.input in database', async () => {
      const result = await updateOne(UserModel, UserType).resolve({
        args: {
          filter: { _id: user1.id },
          input: { name: 'newName' },
        },
      });
      throw new Error('TODO');
    });

    xit('should return document if provided existed id', async () => {
      const result = await updateOne(UserModel, UserType).resolve({ args: { id: user1._id } });
      expect(result).have.property('name').that.equal(user1.name);
    });

    xit('should skip records', async () => {
      const result = await updateOne(UserModel, UserType).resolve({ args: { skip: 2000 } });
      expect(result).to.be.null;
    });

    xit('should sort records', async () => {
      const result1 = await updateOne(UserModel, UserType)
        .resolve({ args: { sort: { _id: 1 } } });

      const result2 = await updateOne(UserModel, UserType)
        .resolve({ args: { sort: { _id: -1 } } });

      expect(`${result1._id}`).not.equal(`${result2._id}`);
    });
  });
});
