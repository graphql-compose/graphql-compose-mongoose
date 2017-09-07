/* @flow */

import { InputTypeComposer } from 'graphql-compose';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { recordHelperArgs } from '../record';
import { UserModel } from '../../../__mocks__/userModel';
import { composeWithMongoose } from '../../../composeWithMongoose';
import typeStorage from '../../../typeStorage';

describe('Resolver helper `record` ->', () => {
  let UserTypeComposer;

  beforeEach(() => {
    typeStorage.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTypeComposer = composeWithMongoose(UserModel);
  });

  describe('recordHelperArgs()', () => {
    it('should throw error if `recordTypeName` not provided in opts', () => {
      expect(() => recordHelperArgs(UserTypeComposer)).toThrowError(
        'provide non-empty `recordTypeName`'
      );
    });

    it('should return input field', () => {
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
      });
      expect(args.record.name).toBe('record');
      expect(args.record.type).toBeInstanceOf(GraphQLInputObjectType);
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
      expect(args.record.type).toBe(existedType);
    });

    it('should for opts.isRequired=true return GraphQLNonNull', () => {
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
        isRequired: true,
      });
      expect(args.record.name).toBe('record');
      expect(args.record.type).toBeInstanceOf(GraphQLNonNull);
    });

    it('should remove fields via opts.removeFields', () => {
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
        removeFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.record.type);
      expect(inputTypeComposer.hasField('name')).toBe(false);
      expect(inputTypeComposer.hasField('age')).toBe(false);
      expect(inputTypeComposer.hasField('gender')).toBe(true);
    });

    it('should set required fields via opts.requiredFields', () => {
      const args = recordHelperArgs(UserTypeComposer, {
        recordTypeName: 'RecordUserType',
        requiredFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.record.type);
      expect(inputTypeComposer.getFieldType('name')).toBeInstanceOf(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('age')).toBeInstanceOf(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('gender')).not.toBeInstanceOf(GraphQLNonNull);
    });
  });
});
