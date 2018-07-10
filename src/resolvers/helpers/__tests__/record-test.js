/* @flow */

import { InputTypeComposer, schemaComposer, type TypeComposer } from 'graphql-compose';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { recordHelperArgs } from '../record';
import { UserModel } from '../../../__mocks__/userModel';
import { convertModelToGraphQL } from '../../../fieldsConverter';

describe('Resolver helper `record` ->', () => {
  let UserTC: TypeComposer;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
  });

  describe('recordHelperArgs()', () => {
    it('should throw error if `recordTypeName` not provided in opts', () => {
      expect(() => recordHelperArgs(UserTC)).toThrowError('provide non-empty `recordTypeName`');
    });

    it('should return input field', () => {
      const args: any = recordHelperArgs(UserTC, {
        recordTypeName: 'RecordUserType',
      });
      expect(args.record.type).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should reuse existed inputType', () => {
      const existedType = InputTypeComposer.create({
        name: 'RecordUserType',
        fields: {},
      });
      schemaComposer.set('RecordUserType', existedType);
      const args: any = recordHelperArgs(UserTC, {
        recordTypeName: 'RecordUserType',
      });
      expect(args.record.type).toBe(existedType.getType());
    });

    it('should for opts.isRequired=true return GraphQLNonNull', () => {
      const args: any = recordHelperArgs(UserTC, {
        recordTypeName: 'RecordUserType',
        isRequired: true,
      });
      expect(args.record.type).toBeInstanceOf(GraphQLNonNull);
    });

    it('should remove fields via opts.removeFields', () => {
      const args: any = recordHelperArgs(UserTC, {
        recordTypeName: 'RecordUserType',
        removeFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.record.type);
      expect(inputTypeComposer.hasField('name')).toBe(false);
      expect(inputTypeComposer.hasField('age')).toBe(false);
      expect(inputTypeComposer.hasField('gender')).toBe(true);
    });

    it('should set required fields via opts.requiredFields', () => {
      const args: any = recordHelperArgs(UserTC, {
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
