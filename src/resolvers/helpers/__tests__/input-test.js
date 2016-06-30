/* @flow */

import { expect } from 'chai';
import { inputHelperArgs } from '../input';
import { UserModel } from '../../../__mocks__/userModel.js';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { convertModelToGraphQL } from '../../../fieldsConverter';
import InputTypeComposer from '../../../../../graphql-compose/src/inputTypeComposer';

const UserType = convertModelToGraphQL(UserModel, 'User');

describe('Resolver helper `input` ->', () => {
  describe('inputHelperArgs()', () => {
    it('should throw error if `inputTypeName` not provided in opts', () => {
      expect(() => inputHelperArgs(UserType))
        .to.throw('provide non-empty `inputTypeName`');
    });

    it('should return input field', () => {
      const args = inputHelperArgs(UserType, {
        inputTypeName: 'InputUserType',
      });
      expect(args).has.property('input');
      expect(args).has.deep.property('input.name', 'input');
      expect(args).has.deep.property('input.type').instanceof(GraphQLInputObjectType);
    });

    it('should for opts.isRequired=true return GraphQLNonNull', () => {
      const args = inputHelperArgs(UserType, {
        inputTypeName: 'InputUserType',
        isRequired: true,
      });
      expect(args).has.property('input');
      expect(args).has.deep.property('input.name', 'input');
      expect(args).has.deep.property('input.type').instanceof(GraphQLNonNull);
    });

    it('should remove fields via opts.removeFields', () => {
      const args = inputHelperArgs(UserType, {
        inputTypeName: 'InputUserType',
        removeFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.input.type);
      expect(inputTypeComposer.hasField('name')).to.be.false;
      expect(inputTypeComposer.hasField('age')).to.be.false;
      expect(inputTypeComposer.hasField('gender')).to.be.true;
    });

    it('should set required fields via opts.requiredFields', () => {
      const args = inputHelperArgs(UserType, {
        inputTypeName: 'InputUserType',
        requiredFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.input.type);
      expect(inputTypeComposer.getFieldType('name')).instanceof(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('age')).instanceof(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('gender')).not.instanceof(GraphQLNonNull);
    });
  });
});
