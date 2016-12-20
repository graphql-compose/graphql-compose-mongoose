/* @flow */

import { expect } from 'chai';
import {
  GraphQLNonNull,
  GraphQLInputObjectType,
  getNullableType,
  GraphQLObjectType,
} from 'graphql';
import { Resolver, TypeComposer, InputTypeComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import updateById from '../updateById';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('updateById() ->', () => {
  let user1;
  let user2;

  beforeEach('init UserModel collection', (done) => {
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

    UserModel.collection.drop(() => {
      Promise.all([
        user1.save(),
        user2.save(),
      ]).then(() => done());
    });
  });

  beforeEach(() => {
    typeStorage.clear();
  });

  it('should return Resolver object', () => {
    const resolver = updateById(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `record` arg', () => {
      const resolver = updateById(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('record');
      expect(argConfig).property('type').instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType.name', 'UpdateByIdUserInput');
    });

    it('should have `record._id` required arg', () => {
      const resolver = updateById(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('record') || {};
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
      const result = updateById(UserModel, UserTypeComposer).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.record._id is empty', async () => {
      const result = updateById(UserModel, UserTypeComposer).resolve({ args: { record: {} } });
      await expect(result).be.rejectedWith(Error, 'requires args.record._id');
    });

    it('should return payload.recordId', async () => {
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: { _id: user1.id, name: 'some name' },
        },
      });
      expect(result).have.property('recordId', user1.id);
    });

    it('should change data via args.record in model', async () => {
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: { _id: user1.id, name: 'newName' },
        },
      });
      expect(result).have.deep.property('record.name', 'newName');
    });

    it('should change data via args.record in database', (done) => {
      const checkedName = 'nameForMongoDB';
      updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: { _id: user1.id, name: checkedName },
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
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: { _id: user1.id, name: checkedName },
        },
      });
      expect(result).have.deep.property('record.id', user1.id);
      expect(result).have.deep.property('record.name', checkedName);
    });

    it('should pass empty projection to findById and got full document data', async () => {
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: {
          record: {
            _id: user1.id,
          },
        },
        projection: {
          record: {
            name: true,
          },
        },
      });
      expect(result).have.deep.property('record.id', user1.id);
      expect(result).have.deep.property('record.name', user1.name);
      expect(result).have.deep.property('record.gender', user1.gender);
    });

    it('should return mongoose document', async () => {
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: { record: { _id: user1.id } },
      });
      expect(result.record).instanceof(UserModel);
    });

    it('should call `beforeRecordMutate` method with founded `record` as arg', async () => {
      let beforeMutationId;
      const result = await updateById(UserModel, UserTypeComposer).resolve({
        args: { record: { _id: user1.id } },
        beforeRecordMutate: (record) => {
          beforeMutationId = record.id;
          return record;
        }
      });
      expect(result.record).instanceof(UserModel);
      expect(beforeMutationId).to.equal(user1.id);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = updateById(UserModel, UserTypeComposer).getOutputType();
      expect(outputType.name)
        .to.equal(`UpdateById${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = updateById(UserModel, UserTypeComposer).getOutputType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('recordId')).to.be.true;
      expect(typeComposer.getField('recordId').type).to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = updateById(UserModel, UserTypeComposer).getOutputType();
      const typeComposer = new TypeComposer(outputType);
      expect(typeComposer.hasField('record')).to.be.true;
      expect(typeComposer.getField('record').type).to.equal(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `UpdateById${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = updateById(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).to.equal(existedType);
    });
  });
});
