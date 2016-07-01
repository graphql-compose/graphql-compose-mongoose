/* @flow */

import { expect } from 'chai';
import { UserModel } from '../../__mocks__/userModel.js';
import updateById from '../updateById';
import Resolver from 'graphql-compose/lib/resolver/resolver';
import TypeComposer from 'graphql-compose/lib/typeComposer';
import InputTypeComposer from 'graphql-compose/lib/inputTypeComposer';
import { convertModelToGraphQL } from '../../fieldsConverter';
import {
  GraphQLNonNull,
  GraphQLInputObjectType,
  getNullableType,
} from 'graphql';
import GraphQLMongoID from '../../types/mongoid';

const UserType = convertModelToGraphQL(UserModel, 'User');

describe('updateById() ->', () => {
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
    const resolver = updateById(UserModel, UserType);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `input` arg', () => {
      const resolver = updateById(UserModel, UserType);
      const argConfig = resolver.getArg('input');
      expect(argConfig).property('type').instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType.name', 'UpdateByIdUserInput');
    });

    it('should have `input._id` required arg', () => {
      const resolver = updateById(UserModel, UserType);
      const argConfig = resolver.getArg('input') || {};
      expect(argConfig).deep.property('type.ofType').instanceof(GraphQLInputObjectType);
      if (argConfig.type && argConfig.type.ofType) {
        const _idFieldType = new InputTypeComposer(argConfig.type.ofType).getFieldType('_id');
        expect(_idFieldType).instanceof(GraphQLNonNull);
        expect(getNullableType(_idFieldType)).equal(GraphQLMongoID);
      }
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateById(UserModel, UserType).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.input._id is empty', async () => {
      const result = updateById(UserModel, UserType).resolve({ args: { input: {} } });
      await expect(result).be.rejectedWith(Error, 'requires args.input._id');
    });

    it('should return payload.recordId', async () => {
      const result = await updateById(UserModel, UserType).resolve({
        args: {
          input: { _id: user1.id, name: 'some name' },
        },
      });
      expect(result).have.property('recordId', user1.id);
    });

    it('should change data via args.input in model', async () => {
      const result = await updateById(UserModel, UserType).resolve({
        args: {
          input: { _id: user1.id, name: 'newName' },
        },
      });
      expect(result).have.deep.property('record.name', 'newName');
    });

    it('should change data via args.input in database', (done) => {
      const checkedName = 'nameForMongoDB';
      updateById(UserModel, UserType).resolve({
        args: {
          input: { _id: user1.id, name: checkedName },
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user1._id }, (err, doc) => {
          expect(doc.name).to.be.equal(checkedName);
          done();
        });
      });
    });

    it('should return payload.record', async () => {
      const checkedName = 'anyName123';
      const result = await updateById(UserModel, UserType).resolve({
        args: {
          input: { _id: user1.id, name: checkedName },
        },
      });
      expect(result).have.deep.property('record.id', user1.id);
      expect(result).have.deep.property('record.name', checkedName);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = updateById(UserModel, UserType).getOutputType();
      expect(outputType.name).to.equal(`UpdateById${UserType.name}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = updateById(UserModel, UserType).getOutputType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('recordId')).to.be.true;
      expect(typeComposer.getField('recordId').type).to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = updateById(UserModel, UserType).getOutputType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('record')).to.be.true;
      expect(typeComposer.getField('record').type).to.equal(UserType);
    });
  });
});
