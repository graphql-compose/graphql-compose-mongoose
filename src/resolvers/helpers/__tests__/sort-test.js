/* @flow */

import { expect, spy } from 'chai';
import {
  sortHelperArgs,
  sortHelper,
  getSortTypeFromModel,
} from '../sort';
import { UserModel } from '../../../__mocks__/userModel.js';
import { GraphQLEnumType } from 'graphql';
import getIndexesFromModel from '../../../utils/getIndexesFromModel';

describe('Resolver helper `sort` ->', () => {
  describe('getSortTypeFromModel()', () => {
    it('should return EnumType', () => {
      const typeName = 'SortType';
      const type = getSortTypeFromModel(typeName, UserModel);
      expect(type).to.be.instanceof(GraphQLEnumType);
      expect(type).have.property('name', typeName);
    });

    it('should have proper enum values', () => {
      const type = getSortTypeFromModel('SortType', UserModel);
      const indexedFields = getIndexesFromModel(UserModel);

      // only indexed fields in enum
      const ascDescNum = indexedFields.length * 2;
      expect(type).property('_values').have.lengthOf(ascDescNum);

      // should have ASC DESC keys
      const enumNames = type._values.map(enumConfig => enumConfig.name);
      expect(enumNames).to.include.members(['_ID_ASC', '_ID_DESC']);

      // should have ASC criteria for mongoose
      const complexASC = type._values.find(enumConfig => enumConfig.name === 'NAME__AGE_ASC');
      expect(complexASC).property('value').deep.equal({ name: 1, age: -1 });

      // should have DESC criteria for mongoose
      const complexDESC = type._values.find(enumConfig => enumConfig.name === 'NAME__AGE_DESC');
      expect(complexDESC).property('value').deep.equal({ name: -1, age: 1 });
    });
  });

  describe('sortHelperArgs()', () => {
    it('should throw error if `sortTypeName` not provided in opts', () => {
      expect(() => sortHelperArgs(UserModel))
        .to.throw('provide non-empty `sortTypeName`');
    });
    it('should return sort field', () => {
      const args = sortHelperArgs(UserModel, {
        sortTypeName: 'SortInput',
      });
      expect(args).has.property('sort');
      expect(args).has.deep.property('sort.name', 'sort');
      expect(args).has.deep.property('sort.type').instanceof(GraphQLEnumType);
    });
  });

  describe('sortHelper()', () => {
    let spyFn;
    let resolveParams;

    beforeEach(() => {
      spyFn = spy();
      resolveParams = {
        query: {
          sort: spyFn,
        },
      };
    });

    it('should not call query.sort if args.sort is empty', () => {
      sortHelper(resolveParams);
      expect(spyFn).to.have.not.been.called();
    });

    it('should call query.sort if args.sort is provided', () => {
      const sortValue = { _id: 1 };
      resolveParams.args = { sort: sortValue };
      sortHelper(resolveParams);
      expect(spyFn).to.have.been.called.with(sortValue);
    });
  });
});
