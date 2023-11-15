import { EnumTypeComposer, ObjectTypeComposer, schemaComposer } from 'graphql-compose';
import { getSortTypeFromModel, sortHelper, sortHelperArgs } from '../sort';
import { UserModel } from '../../../__mocks__/userModel';
import { convertModelToGraphQL } from '../../../fieldsConverter';
import { getIndexesFromModel } from '../../../utils';

describe('Resolver helper `sort` ->', () => {
  let UserTC: ObjectTypeComposer<any, any>;

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
  });

  describe('getSortTypeFromModel()', () => {
    it('should return EnumType', () => {
      const typeName = 'SortType';
      const etc = getSortTypeFromModel(typeName, UserModel, schemaComposer);
      expect(etc).toBeInstanceOf(EnumTypeComposer);
      expect(etc.getTypeName()).toBe(typeName);
    });

    it('should reuse existed EnumType', () => {
      const typeName = 'SortType';
      const existedETC = schemaComposer.getOrCreateETC(typeName);
      const etc = getSortTypeFromModel(typeName, UserModel, schemaComposer);
      expect(etc).toBe(existedETC);
    });

    it('should have proper enum values', () => {
      const etc = getSortTypeFromModel('SortType', UserModel, schemaComposer);
      const indexedFields = getIndexesFromModel(UserModel);

      // only indexed fields in enum
      const ascDescNum = indexedFields.length * 2;
      expect(etc.getFieldNames()).toHaveLength(ascDescNum);

      // should have ASC DESC keys
      const enumNames = etc.getFieldNames();
      expect(enumNames).toEqual(expect.arrayContaining(['_ID_ASC', '_ID_DESC']));

      // should have ASC criteria for mongoose
      const complexASC = etc.getField('NAME__AGE_ASC');
      expect(complexASC.value).toEqual({ name: 1, age: -1 });

      // should have DESC criteria for mongoose
      const complexDESC = etc.getField('NAME__AGE_DESC');
      expect(complexDESC.value).toEqual({ name: -1, age: 1 });
    });
  });

  describe('sortHelperArgs()', () => {
    it('should throw error if first arg is not ObjectTypeComposer', () => {
      expect(() => {
        const wrongArgs: any = [{}];
        // @ts-expect-error
        sortHelperArgs(...wrongArgs);
      }).toThrowError('should be instance of ObjectTypeComposer');
    });

    it('should throw error if second arg is not Mongoose model', () => {
      expect(() => {
        const wrongArgs: any = [UserTC, {}];
        // @ts-expect-error
        sortHelperArgs(...wrongArgs);
      }).toThrowError('should be instance of Mongoose Model');
    });

    it('should throw error if `sortTypeName` not provided in opts', () => {
      expect(() => sortHelperArgs(UserTC, UserModel)).toThrowError(
        'provide non-empty `sortTypeName`'
      );
    });

    it('should return sort field', () => {
      const args: any = sortHelperArgs(UserTC, UserModel, {
        sortTypeName: 'SortInput',
      });
      expect(args.sort.type.getTypeName()).toBe('SortInput');
      expect(args.sort.type).toBeInstanceOf(EnumTypeComposer);
    });

    it('should return sort field as List', () => {
      const args: any = sortHelperArgs(UserTC, UserModel, {
        sortTypeName: 'SortInput',
        multi: true,
      });
      expect(args.sort.type.getTypeName()).toBe('[SortInput!]');
    });
  });

  describe('sortHelper()', () => {
    let spyFn: jest.Mock<any, any>;
    let resolveParams: any;

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
