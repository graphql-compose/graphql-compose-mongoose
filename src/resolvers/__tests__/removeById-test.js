/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import removeById from '../removeById';
import Resolver from '../../../../graphql-compose/src/resolver/resolver';
import TypeComposer from '../../../../graphql-compose/src/typeComposer';
import { convertModelToGraphQL } from '../../fieldsConverter';
import { GraphQLNonNull } from 'graphql';
import GraphQLMongoID from '../../types/mongoid';

const UserType = convertModelToGraphQL(UserModel, 'User');

describe('removeById() ->', () => {
  let user;

  before('clear UserModel collection', (done) => {
    UserModel.collection.drop(done);
  });

  beforeEach('add test user document to mongoDB', () => {
    user = new UserModel({
      name: 'userName1',
      skills: ['js', 'ruby', 'php', 'python'],
      gender: 'male',
      relocation: true,
    });

    return Promise.all([
      user.save(),
    ]);
  });

  it('should return Resolver object', () => {
    const resolver = removeById(UserModel, UserType);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have non-null `_id` arg', () => {
      const resolver = removeById(UserModel, UserType);
      expect(resolver.hasArg('_id')).to.be.true;
      const argConfig = resolver.getArg('_id');
      expect(argConfig).property('type').that.instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType').that.equal(GraphQLMongoID);
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = removeById(UserModel, UserType).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args._id is empty', async () => {
      const result = removeById(UserModel, UserType).resolve({ args: { } });
      await expect(result).be.rejectedWith(Error, 'requires args._id');
    });

    it('should return payload.recordId', async () => {
      const result = await removeById(UserModel, UserType).resolve({
        args: {
          _id: user.id,
        },
      });
      expect(result).have.property('recordId', user.id);
    });

    it('should return payload.recordId even document not exists', async () => {
      const unexistedId = '500000000000000000000000';
      const result = await removeById(UserModel, UserType).resolve({
        args: {
          _id: unexistedId,
        },
      });
      expect(result).have.property('recordId', unexistedId);
    });


    it('should remove document in database', (done) => {
      removeById(UserModel, UserType).resolve({
        args: {
          _id: user.id,
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user._id }, (err, doc) => {
          expect(err).to.be.null;
          expect(doc).to.be.null;
          done();
        });
      });
    });

    it('should return payload.record', async () => {
      const result = await removeById(UserModel, UserType).resolve({
        args: {
          _id: user.id,
        },
      });
      expect(result).have.deep.property('record.id', user.id);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = removeById(UserModel, UserType).getOutputType();
      expect(outputType.name).to.equal(`RemoveById${UserType.name}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = removeById(UserModel, UserType).getOutputType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('recordId')).to.be.true;
      expect(typeComposer.getField('recordId').type).to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = removeById(UserModel, UserType).getOutputType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('record')).to.be.true;
      expect(typeComposer.getField('record').type).to.equal(UserType);
    });
  });
});
