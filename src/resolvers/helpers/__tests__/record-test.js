/* @flow */

import {
  schemaComposer,
  NonNullComposer,
  InputTypeComposer,
  type ObjectTypeComposer,
} from 'graphql-compose';
import { recordHelperArgs } from '../record';
import { UserModel } from '../../../__mocks__/userModel';
import { convertModelToGraphQL } from '../../../fieldsConverter';

describe('Resolver helper `record` ->', () => {
  let UserTC: ObjectTypeComposer<any, any>;

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
      expect(args.record.type).toBeInstanceOf(InputTypeComposer);
    });

    it('should reuse existed inputType', () => {
      const existedType = schemaComposer.createInputTC({
        name: 'RecordUserType',
        fields: {},
      });
      schemaComposer.set('RecordUserType', existedType);
      const args: any = recordHelperArgs(UserTC, {
        recordTypeName: 'RecordUserType',
      });
      expect(args.record.type).toBe(existedType);
    });

    it('should for opts.isRequired=true return NonNullComposer', () => {
      const args: any = recordHelperArgs(UserTC, {
        recordTypeName: 'RecordUserType',
        isRequired: true,
      });
      expect(args.record.type).toBeInstanceOf(NonNullComposer);
    });

    it('should remove fields via opts.removeFields', () => {
      const args: any = recordHelperArgs(UserTC, {
        recordTypeName: 'RecordUserType',
        removeFields: ['name', 'age'],
      });
      const inputTypeComposer = args.record.type;
      expect(inputTypeComposer.hasField('name')).toBe(false);
      expect(inputTypeComposer.hasField('age')).toBe(false);
      expect(inputTypeComposer.hasField('gender')).toBe(true);
    });

    it('should set required fields via opts.requiredFields', () => {
      const args: any = recordHelperArgs(UserTC, {
        recordTypeName: 'RecordUserType',
        requiredFields: ['name', 'age'],
      });
      const inputTypeComposer = args.record.type;
      expect(inputTypeComposer.getField('name').type).toBeInstanceOf(NonNullComposer);
      expect(inputTypeComposer.getField('age').type).toBeInstanceOf(NonNullComposer);
      expect(inputTypeComposer.getField('gender').type).not.toBeInstanceOf(NonNullComposer);
    });
  });
});
