/* @flow */

import { expect } from 'chai';
import { recordHelperArgs } from '../record';
import { UserModel } from '../../../__mocks__/userModel.js';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { InputTypeComposer } from 'graphql-compose';
import { composeWithMongoose } from '../../../composeWithMongoose';
import typeStorage from '../../../typeStorage';

const UserTypeComposer = composeWithMongoose(UserModel);

describe('Resolver helper `record` ->', () => {
  beforeEach(() => {
    typeStorage.clear();
  });

  describe('recordHelperArgs()', () => {
    it('should throw error if `recordTypeName` not provided in opts', () => {
      expect(() => recordHelperArgs(UserTypeComposer))
        .to.throw('provide non-empty `recordTypeName`');
    });

    it('should return input field', () => {
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
      });
      expect(args).has.property('record');
      expect(args).has.deep.property('record.name', 'record');
      expect(args).has.deep.property('record.type').instanceof(GraphQLInputObjectType);
    });

    it('should reuse existed inputType', () => {
      const existedType = new GraphQLInputObjectType({
        name: 'RecordUserType',
        fields: {},
      });
      typeStorage.set('RecordUserType', existedType);
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
      });
      expect(args).has.deep.property('record.type').equal(existedType);
    });

    it('should for opts.isRequired=true return GraphQLNonNull', () => {
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
        isRequired: true,
      });
      expect(args).has.property('record');
      expect(args).has.deep.property('record.name', 'record');
      expect(args).has.deep.property('record.type').instanceof(GraphQLNonNull);
    });

    it('should remove fields via opts.removeFields', () => {
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
        removeFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.record.type);
      expect(inputTypeComposer.hasField('name')).to.be.false;
      expect(inputTypeComposer.hasField('age')).to.be.false;
      expect(inputTypeComposer.hasField('gender')).to.be.true;
    });

    it('should set required fields via opts.requiredFields', () => {
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
        requiredFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.record.type);
      expect(inputTypeComposer.getFieldType('name')).instanceof(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('age')).instanceof(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('gender')).not.instanceof(GraphQLNonNull);
    });
  });
});
