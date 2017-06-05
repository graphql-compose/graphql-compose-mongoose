/* @flow */

import { GraphQLEnumType } from 'graphql';
import { sortHelperArgs, sortHelper, getSortTypeFromModel } from '../sort';
import { UserModel } from '../../../__mocks__/userModel';
import { getIndexesFromModel } from '../../../utils/getIndexesFromModel';
import typeStorage from '../../../typeStorage';

describe('Resolver helper `sort` ->', () => {
  beforeEach(() => {
    typeStorage.clear();
  });

  describe('getSortTypeFromModel()', () => {
    it('should return EnumType', () => {
      const typeName = 'SortType';
      const type = getSortTypeFromModel(typeName, UserModel);
      expect(type).toBeInstanceOf(GraphQLEnumType);
      expect(type).toHaveProperty('name', typeName);
    });

    it('should reuse existed EnumType', () => {
      const typeName = 'SortType';
      typeStorage.set(typeName, 'EXISTED_TYPE');
      const type = getSortTypeFromModel(typeName, UserModel);
      expect(type).toBe('EXISTED_TYPE');
    });

    it('should have proper enum values', () => {
      const type = getSortTypeFromModel('SortType', UserModel);
      const indexedFields = getIndexesFromModel(UserModel);

      // only indexed fields in enum
      const ascDescNum = indexedFields.length * 2;
      expect(type._values).toHaveLength(ascDescNum);

      // should have ASC DESC keys
      const enumNames = type._values.map(enumConfig => enumConfig.name);
      expect(enumNames).toEqual(expect.arrayContaining(['_ID_ASC', '_ID_DESC']));

      // should have ASC criteria for mongoose
      const complexASC = type._values.find(enumConfig => enumConfig.name === 'NAME__AGE_ASC');
      expect(complexASC.value).toEqual({ name: 1, age: -1 });

      // should have DESC criteria for mongoose
      const complexDESC = type._values.find(enumConfig => enumConfig.name === 'NAME__AGE_DESC');
      expect(complexDESC.value).toEqual({ name: -1, age: 1 });
    });
  });

  describe('sortHelperArgs()', () => {
    it('should throw error if `sortTypeName` not provided in opts', () => {
      expect(() => sortHelperArgs(UserModel)).toThrowError('provide non-empty `sortTypeName`');
    });
    it('should return sort field', () => {
      const args = sortHelperArgs(UserModel, {
        sortTypeName: 'SortInput',
      });
      expect(args).toHaveProperty('sort');
      expect(args).toHaveProperty('sort.name', 'sort');
      expect(args.sort.type).toBeInstanceOf(GraphQLEnumType);
    });
  });

  describe('sortHelper()', () => {
    let spyFn;
    let resolveParams;

    beforeEach(() => {
      spyFn = jest.fn();
      resolveParams = {
        query: {
          sort: spyFn,
        },
      };
    });

    it('should not call query.sort if args.sort is empty', () => {
      sortHelper(resolveParams);
      expect(spyFn).not.toHaveBeenCalled();
    });

    it('should call query.sort if args.sort is provided', () => {
      const sortValue = { _id: 1 };
      resolveParams.args = { sort: sortValue };
      sortHelper(resolveParams);
      expect(spyFn).toBeCalledWith(sortValue);
    });
  });
});
