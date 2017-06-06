/* @flow */

import { InputTypeComposer, graphql } from 'graphql-compose';
import {
  filterHelperArgs,
  filterHelper,
  getIndexedFieldNames,
  addFieldsWithOperator,
  OPERATORS_FIELDNAME,
} from '../filter';
import { UserModel } from '../../../__mocks__/userModel';
import { composeWithMongoose } from '../../../composeWithMongoose';
import typeStorage from '../../../typeStorage';

const { GraphQLInputObjectType, GraphQLNonNull } = graphql;

describe('Resolver helper `filter` ->', () => {
  let UserTypeComposer;

  beforeEach(() => {
    typeStorage.clear();
    UserModel.schema._gqcTypeComposer = undefined;
    UserTypeComposer = composeWithMongoose(UserModel);
  });

  describe('getIndexedFieldNames()', () => {
    it('should return array of indexed fieldNames', () => {
      const indexedFields = getIndexedFieldNames(UserModel);
      expect(indexedFields).toEqual(expect.arrayContaining(['_id', 'employment', 'name']));
      expect(indexedFields).not.toEqual(expect.arrayContaining(['age', 'gender']));
    });
  });

  describe('addFieldsWithOperator()', () => {
    let args;
    let inputTypeComposer;

    beforeEach(() => {
      typeStorage.clear();
      args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
      });
      inputTypeComposer = new InputTypeComposer(args.filter.type);
    });

    it('should add OPERATORS_FIELDNAME to filterType', () => {
      addFieldsWithOperator('testTypeName', inputTypeComposer, UserModel, {});
      expect(inputTypeComposer.hasField(OPERATORS_FIELDNAME)).toBe(true);
    });

    it('should by default have only indexed fields', () => {
      addFieldsWithOperator('testTypeName', inputTypeComposer, UserModel, {});
      const operatorsType = inputTypeComposer.getFieldType(OPERATORS_FIELDNAME);
      const opComposer = new InputTypeComposer(operatorsType);
      expect(opComposer.getFieldNames()).toEqual(
        expect.arrayContaining(['name', '_id', 'employment'])
      );
    });

    it('should have only provided fields via options', () => {
      addFieldsWithOperator('testTypeName', inputTypeComposer, UserModel, { age: ['lt'] });
      const operatorsType = inputTypeComposer.getFieldType(OPERATORS_FIELDNAME);
      const opComposer = new InputTypeComposer(operatorsType);
      expect(opComposer.getFieldNames()).toEqual(expect.arrayContaining(['age']));
    });

    it('should have only provided operators via options for field', () => {
      addFieldsWithOperator('testTypeName', inputTypeComposer, UserModel, { age: ['lt', 'gte'] });
      const operatorsType = inputTypeComposer.getFieldType(OPERATORS_FIELDNAME);
      const opComposer = new InputTypeComposer(operatorsType);
      const ageComposer = new InputTypeComposer(opComposer.getFieldType('age'));
      expect(ageComposer.getFieldNames()).toEqual(expect.arrayContaining(['lt', 'gte']));
    });

    it('should reuse existed operatorsType', () => {
      const existedType = new GraphQLInputObjectType({
        name: 'ExistedType',
        fields: {},
      });
      typeStorage.set('ExistedType', existedType);
      addFieldsWithOperator('ExistedType', inputTypeComposer, UserModel, { age: ['lt'] });
      const operatorsType = inputTypeComposer.getFieldType(OPERATORS_FIELDNAME);
      expect(operatorsType).toBe(existedType);
    });
  });

  describe('filterHelperArgs()', () => {
    it('should throw error if first arg is not TypeComposer', () => {
      expect(() => filterHelperArgs({})).toThrowError('should be instance of TypeComposer');
    });

    it('should throw error if second arg is not MongooseModel', () => {
      expect(() => filterHelperArgs(UserTypeComposer, {})).toThrowError(
        'should be instance of MongooseModel'
      );
    });

    it('should throw error if `filterTypeName` not provided in opts', () => {
      expect(() => filterHelperArgs(UserTypeComposer, UserModel)).toThrowError(
        'provide non-empty `filterTypeName`'
      );
    });

    it('should return filter field', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
      });
      expect(args.filter.name).toBe('filter');
      expect(args.filter.type).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should for opts.isRequired=true return GraphQLNonNull', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
        isRequired: true,
      });
      expect(args.filter.name).toBe('filter');
      expect(args.filter.type).toBeInstanceOf(GraphQLNonNull);
    });

    it('should remove fields via opts.removeFields', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
        removeFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.hasField('name')).toBe(false);
      expect(inputTypeComposer.hasField('age')).toBe(false);
      expect(inputTypeComposer.hasField('gender')).toBe(true);
    });

    it('should set required fields via opts.requiredFields', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
        requiredFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.getFieldType('name')).toBeInstanceOf(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('age')).toBeInstanceOf(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('gender')).not.toBeInstanceOf(GraphQLNonNull);
    });

    it('should leave only indexed fields if opts.onlyIndexed=true', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
        onlyIndexed: true,
        model: UserModel,
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.hasField('_id')).toBe(true);
      expect(inputTypeComposer.hasField('name')).toBe(true);
      expect(inputTypeComposer.hasField('age')).toBe(false);
      expect(inputTypeComposer.hasField('gender')).toBe(false);
    });

    it('should opts.onlyIndexed=true and opts.removeFields works together', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
        onlyIndexed: true,
        model: UserModel,
        removeFields: ['name'],
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.hasField('_id')).toBe(true);
      expect(inputTypeComposer.hasField('name')).toBe(false);
      expect(inputTypeComposer.hasField('age')).toBe(false);
      expect(inputTypeComposer.hasField('gender')).toBe(false);
    });
  });

  describe('filterHelper()', () => {
    let spyWhereFn;
    let spyWhere2Fn;
    let spyFindFn;
    let resolveParams;

    beforeEach(() => {
      spyWhereFn = jest.fn(() => {
        spyWhere2Fn = jest.fn();
        return {
          ...UserModel.find(),
          where: spyWhere2Fn,
        };
      });

      spyFindFn = jest.fn();
      resolveParams = {
        query: {
          ...UserModel.find(),
          where: spyWhereFn,
          find: spyFindFn,
        },
      };
    });

    it('should not call query.where if args.filter is empty', () => {
      filterHelper(resolveParams);
      expect(spyWhereFn).not.toBeCalled();
    });

    it('should call query.where if args.filter is provided', () => {
      resolveParams.args = {
        filter: { name: 'nodkz' },
      };
      filterHelper(resolveParams);
      expect(spyWhereFn).toBeCalledWith({ name: 'nodkz' });
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
      expect(spyWhereFn).toBeCalledWith({
        'name.first': 'Pavel',
        age: 30,
      });
    });

    it('should call query.find if args.filter.OPERATORS_FIELDNAME is provided', () => {
      resolveParams.args = {
        filter: {
          [OPERATORS_FIELDNAME]: { age: { gt: 10, lt: 20 } },
        },
      };
      filterHelper(resolveParams);
      expect(spyWhereFn).toBeCalledWith({ age: { $gt: 10, $lt: 20 } });
    });

    it('should add rawQuery to query', () => {
      resolveParams.args = {
        filter: {
          [OPERATORS_FIELDNAME]: { age: { gt: 10, lt: 20 } },
        },
      };
      resolveParams.rawQuery = {
        age: { max: 30 },
        active: true,
      };

      filterHelper(resolveParams);
      expect(spyWhereFn).toBeCalledWith({ age: { $gt: 10, $lt: 20 } });
      expect(spyWhere2Fn).toBeCalledWith({ age: { max: 30 }, active: true });
    });
  });
});
