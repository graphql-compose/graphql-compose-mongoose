/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import updateMany from '../updateMany';
import Resolver from '../../../../graphql-compose/src/resolver/resolver';
import TypeComposer from '../../../../graphql-compose/src/typeComposer';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { GraphQLInt } from 'graphql';

const UserType = convertModelToGraphQL(UserModel, 'User');

describe('updateMany() ->', () => {
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
      relocation: true,
    });

    return Promise.all([
      user1.save(),
      user2.save(),
    ]);
  });

  it('should return Resolver object', () => {
    const resolver = updateMany(UserModel, UserType);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = updateMany(UserModel, UserType);
      expect(resolver.hasArg('filter')).to.be.true;
    });

    it('should have `limit` arg', () => {
      const resolver = updateMany(UserModel, UserType);
      expect(resolver.hasArg('limit')).to.be.true;
    });

    it('should have `skip` arg', () => {
      const resolver = updateMany(UserModel, UserType);
      expect(resolver.hasArg('skip')).to.be.true;
    });

    it('should have `sort` arg', () => {
      const resolver = updateMany(UserModel, UserType);
      expect(resolver.hasArg('sort')).to.be.true;
    });

    it('should have `input` arg', () => {
      const resolver = updateMany(UserModel, UserType);
      expect(resolver.hasArg('input')).to.be.true;
      const argConfig = resolver.getArg('input');
      expect(argConfig).has.deep.property('type.name', 'UpdateManyUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateMany(UserModel, UserType).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.input is empty', async () => {
      const result = updateMany(UserModel, UserType).resolve({ args: {} });
      await expect(result).be.rejectedWith(Error, 'at least one value in args.input');
    });

    it('should change data via args.input in database', (done) => {
      const checkedName = 'nameForMongoDB';
      updateMany(UserModel, UserType).resolve({
        args: {
          filter: { _id: user1.id },
          input: { name: checkedName },
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user1._id }, (err, doc) => {
          expect(doc).property('name').to.be.equal(checkedName);
          done();
        });
      });
    });

    it('should return payload.numAffected', async () => {
      const result = await updateMany(UserModel, UserType).resolve({
        args: {
          input: { gender: 'female' },
        },
      });
      expect(result).have.deep.property('numAffected', 2);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = updateMany(UserModel, UserType).getOutputType();
      expect(outputType).property('name').to.equal(`UpdateMany${UserType.name}Payload`);
    });

    it('should have numAffected field', () => {
      const outputType = updateMany(UserModel, UserType).getOutputType();
      const numAffectedField = new TypeComposer(outputType).getField('numAffected');
      expect(numAffectedField).property('type').to.equal(GraphQLInt);
    });
  });
});
