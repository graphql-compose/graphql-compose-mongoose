/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import updateOne from '../updateOne';
import Resolver from 'graphql-compose/lib/resolver/resolver';
import TypeComposer from 'graphql-compose/lib/typeComposer';
import { convertModelToGraphQL } from '../../fieldsConverter';
import GraphQLMongoID from '../../types/mongoid';
import { GraphQLNonNull } from 'graphql';

const UserType = convertModelToGraphQL(UserModel, 'User');

describe('updateOne() ->', () => {
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
    const resolver = updateOne(UserModel, UserType);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = updateOne(UserModel, UserType);
      expect(resolver.hasArg('filter')).to.be.true;
    });

    it('should have `skip` arg', () => {
      const resolver = updateOne(UserModel, UserType);
      expect(resolver.hasArg('skip')).to.be.true;
    });

    it('should have `sort` arg', () => {
      const resolver = updateOne(UserModel, UserType);
      expect(resolver.hasArg('sort')).to.be.true;
    });

    it('should have required `input` arg', () => {
      const resolver = updateOne(UserModel, UserType);
      const argConfig = resolver.getArg('input');
      expect(argConfig).property('type').instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType.name', 'UpdateOneUserInput');
    });
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

    it('should return payload.recordId', async () => {
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

    it('should change data via args.input in database', (done) => {
      const checkedName = 'nameForMongoDB';
      updateOne(UserModel, UserType).resolve({
        args: {
          filter: { _id: user1.id },
          input: { name: checkedName },
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user1._id }, (err, doc) => {
          expect(doc.name).to.be.equal(checkedName);
          done();
        });
      });
    });

    it('should return payload.record', async () => {
      const result = await updateOne(UserModel, UserType).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result).have.deep.property('record.id', user1.id);
    });

    it('should skip records', async () => {
      const result1 = await updateOne(UserModel, UserType).resolve({
        args: {
          filter: { relocation: true },
          skip: 0,
        },
      });
      const result2 = await updateOne(UserModel, UserType).resolve({
        args: {
          filter: { relocation: true },
          skip: 1,
        },
      });
      expect(result1.record.id).to.not.equal(result2.record.id);
    });

    it('should sort records', async () => {
      const result1 = await updateOne(UserModel, UserType).resolve({
        args: {
          filter: { relocation: true },
          sort: { _id: 1 },
        },
      });
      const result2 = await updateOne(UserModel, UserType).resolve({
        args: {
          filter: { relocation: true },
          sort: { _id: -1 },
        },
      });
      expect(result1.record.id).to.not.equal(result2.record.id);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = updateOne(UserModel, UserType).getOutputType();
      expect(outputType).property('name').to.equal(`UpdateOne${UserType.name}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = updateOne(UserModel, UserType).getOutputType();
      const recordIdField = new TypeComposer(outputType).getField('recordId');
      expect(recordIdField).property('type').to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = updateOne(UserModel, UserType).getOutputType();
      const recordField = new TypeComposer(outputType).getField('record');
      expect(recordField).property('type').to.equal(UserType);
    });
  });
});
