/* @flow */

import { expect, spy } from 'chai';
import {
  filterHelperArgs,
  filterHelper,
  getIndexedFieldNames,
} from '../filter';
import { UserModel } from '../../../__mocks__/userModel.js';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { convertModelToGraphQL } from '../../../fieldsConverter';
import InputTypeComposer from '../../../../../graphql-compose/src/inputTypeComposer';

const UserType = convertModelToGraphQL(UserModel, 'User');

describe('Resolver helper `filter` ->', () => {
  describe('getIndexedFieldNames()', () => {
    it('should return array of indexed fieldNames', () => {
      const indexedFields = getIndexedFieldNames(UserModel);
      expect(indexedFields).have.members(
        ['_id', 'employment', 'name']
      );
      expect(indexedFields).not.have.members(
        ['age', 'gender']
      );
    });
  });

  describe('filterHelperArgs()', () => {
    it('should throw error if `filterTypeName` not provided in opts', () => {
      expect(() => filterHelperArgs(UserType))
        .to.throw('provide non-empty `filterTypeName`');
    });

    it('should return filter field', () => {
      const args = filterHelperArgs(UserType, {
        filterTypeName: 'FilterUserType',
      });
      expect(args).has.property('filter');
      expect(args).has.deep.property('filter.name', 'filter');
      expect(args).has.deep.property('filter.type').instanceof(GraphQLInputObjectType);
    });

    it('should for opts.isRequired=true return GraphQLNonNull', () => {
      const args = filterHelperArgs(UserType, {
        filterTypeName: 'FilterUserType',
        isRequired: true,
      });
      expect(args).has.property('filter');
      expect(args).has.deep.property('filter.name', 'filter');
      expect(args).has.deep.property('filter.type').instanceof(GraphQLNonNull);
    });

    it('should remove fields via opts.removeFields', () => {
      const args = filterHelperArgs(UserType, {
        filterTypeName: 'FilterUserType',
        removeFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.hasField('name')).to.be.false;
      expect(inputTypeComposer.hasField('age')).to.be.false;
      expect(inputTypeComposer.hasField('gender')).to.be.true;
    });

    it('should set required fields via opts.requiredFields', () => {
      const args = filterHelperArgs(UserType, {
        filterTypeName: 'FilterUserType',
        requiredFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.getFieldType('name')).instanceof(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('age')).instanceof(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('gender')).not.instanceof(GraphQLNonNull);
    });

    it('should throw error if opts.onlyIndexed=true and opts.model not provided', () => {
      expect(() => {
        filterHelperArgs(UserType, {
          filterTypeName: 'FilterUserType',
          onlyIndexed: true,
        });
      }).to.throw('You should provide `model`');
    });

    it('should leave only indexed fields if opts.onlyIndexed=true', () => {
      const args = filterHelperArgs(UserType, {
        filterTypeName: 'FilterUserType',
        onlyIndexed: true,
        model: UserModel,
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.hasField('_id')).to.be.true;
      expect(inputTypeComposer.hasField('name')).to.be.true;
      expect(inputTypeComposer.hasField('age')).to.be.false;
      expect(inputTypeComposer.hasField('gender')).to.be.false;
    });

    it('should opts.onlyIndexed=true and opts.removeFields works together', () => {
      const args = filterHelperArgs(UserType, {
        filterTypeName: 'FilterUserType',
        onlyIndexed: true,
        model: UserModel,
        removeFields: ['name'],
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.hasField('_id')).to.be.true;
      expect(inputTypeComposer.hasField('name')).to.be.false;
      expect(inputTypeComposer.hasField('age')).to.be.false;
      expect(inputTypeComposer.hasField('gender')).to.be.false;
    });
  });

  describe('filterHelper()', () => {
    let spyFn;
    let resolveParams;

    beforeEach(() => {
      spyFn = spy();
      resolveParams = {
        query: {
          where: spyFn,
        },
      };
    });

    it('should not call query.where if args.filter is empty', () => {
      filterHelper(resolveParams);
      expect(spyFn).to.have.not.been.called();
    });
    it('should call query.where if args.filter is provided', () => {
      resolveParams.args = {
        filter: { name: 'nodkz' },
      };
      filterHelper(resolveParams);
      expect(spyFn).to.have.been.called.with({ name: 'nodkz' });
    });
    it('should convert deep object in args.filter to dotted object', () => {
      resolveParams.args = {
        filter: {
          name: {
            first: 'Pavel',
          },
          age: 30,
        },
      };
      filterHelper(resolveParams);
      expect(spyFn).to.have.been.called.with({
        'name.first': 'Pavel',
        age: 30,
      });
    });
  });
});
