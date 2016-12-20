/* @flow */

import { expect } from 'chai';
import { GraphQLNonNull, GraphQLObjectType } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { UserModel } from '../../__mocks__/userModel';
import updateOne from '../updateOne';
import GraphQLMongoID from '../../types/mongoid';
import { composeWithMongoose } from '../../composeWithMongoose';
import typeStorage from '../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('updateOne() ->', () => {
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
    const resolver = updateOne(UserModel, UserTypeComposer);
    expect(resolver).to.be.instanceof(Resolver);
  });

  describe('Resolver.args', () => {
    it('should have `filter` arg', () => {
      const resolver = updateOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('filter')).to.be.true;
    });

    it('should have `skip` arg', () => {
      const resolver = updateOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('skip')).to.be.true;
    });

    it('should have `sort` arg', () => {
      const resolver = updateOne(UserModel, UserTypeComposer);
      expect(resolver.hasArg('sort')).to.be.true;
    });

    it('should have required `record` arg', () => {
      const resolver = updateOne(UserModel, UserTypeComposer);
      const argConfig = resolver.getArg('record');
      expect(argConfig).property('type').instanceof(GraphQLNonNull);
      expect(argConfig).deep.property('type.ofType.name', 'UpdateOneUserInput');
    });
  });

  describe('Resolver.resolve():Promise', () => {
    it('should be promise', () => {
      const result = updateOne(UserModel, UserTypeComposer).resolve({});
      expect(result).instanceof(Promise);
      result.catch(() => 'catch error if appear, hide it from mocha');
    });

    it('should rejected with Error if args.filter is empty', async () => {
      const result = updateOne(UserModel, UserTypeComposer).resolve({ args: {} });
      await expect(result).be.rejectedWith(Error, 'at least one value in args.filter');
    });

    it('should return payload.recordId', async () => {
      const result = await updateOne(UserModel, UserTypeComposer).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result).have.property('recordId', user1.id);
    });

    it('should change data via args.record in model', async () => {
      const result = await updateOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: 'newName' },
        },
      });
      expect(result).have.deep.property('record.name', 'newName');
    });

    it('should change data via args.record in database', (done) => {
      const checkedName = 'nameForMongoDB';
      updateOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
          record: { name: checkedName },
        },
      }).then(() => {
        UserModel.collection.findOne({ _id: user1._id }, (err, doc) => {
          expect(doc.name).to.be.equal(checkedName);
          done();
        });
      });
    });

    it('should return payload.record', async () => {
      const result = await updateOne(UserModel, UserTypeComposer).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result).have.deep.property('record.id', user1.id);
    });

    it('should skip records', async () => {
      const result1 = await updateOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { relocation: true },
          skip: 0,
        },
      });
      const result2 = await updateOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { relocation: true },
          skip: 1,
        },
      });
      expect(result1.record.id).to.not.equal(result2.record.id);
    });

    it('should sort records', async () => {
      const result1 = await updateOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { relocation: true },
          sort: { _id: 1 },
        },
      });
      const result2 = await updateOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { relocation: true },
          sort: { _id: -1 },
        },
      });
      expect(result1.record.id).to.not.equal(result2.record.id);
    });

    it('should pass empty projection to findOne and got full document data', async () => {
      const result = await updateOne(UserModel, UserTypeComposer).resolve({
        args: {
          filter: { _id: user1.id },
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
      const result = await updateOne(UserModel, UserTypeComposer).resolve({
        args: { filter: { _id: user1.id } },
      });
      expect(result.record).instanceof(UserModel);
    });

    it('should call `beforeRecordMutate` method with founded `record` as arg', async () => {
      let beforeMutationId;
      const result = await updateOne(UserModel, UserTypeComposer).resolve({
        args: { filter: { _id: user1.id } },
        beforeRecordMutate: (record) => {
          beforeMutationId = record.id;
          return record;
        },
      });
      expect(result.record).instanceof(UserModel);
      expect(beforeMutationId).to.equal(user1.id);
    });
  });

  describe('Resolver.getOutputType()', () => {
    it('should have correct output type name', () => {
      const outputType = updateOne(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).property('name')
        .to.equal(`UpdateOne${UserTypeComposer.getTypeName()}Payload`);
    });

    it('should have recordId field', () => {
      const outputType = updateOne(UserModel, UserTypeComposer).getOutputType();
      const recordIdField = new TypeComposer(outputType).getField('recordId');
      expect(recordIdField).property('type').to.equal(GraphQLMongoID);
    });

    it('should have record field', () => {
      const outputType = updateOne(UserModel, UserTypeComposer).getOutputType();
      const recordField = new TypeComposer(outputType).getField('record');
      expect(recordField).property('type').to.equal(UserTypeComposer.getType());
    });

    it('should reuse existed outputType', () => {
      const outputTypeName = `UpdateOne${UserTypeComposer.getTypeName()}Payload`;
      const existedType = new GraphQLObjectType({
        name: outputTypeName,
        fields: () => ({}),
      });
      typeStorage.set(outputTypeName, existedType);
      const outputType = updateOne(UserModel, UserTypeComposer).getOutputType();
      expect(outputType).to.equal(existedType);
    });
  });
});
