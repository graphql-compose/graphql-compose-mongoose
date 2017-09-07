/* @flow */

import { InputTypeComposer } from 'graphql-compose';
import { GraphQLInputObjectType, GraphQLNonNull, GraphQLList } from 'graphql-compose/lib/graphql';
import {
  filterHelperArgs,
  filterHelper,
  getIndexedFieldNames,
  addFieldsWithOperator,
  OPERATORS_FIELDNAME,
} from '../filter';
import GraphQLMongoID from '../../../types/mongoid';
import { UserModel } from '../../../__mocks__/userModel';
import { composeWithMongoose } from '../../../composeWithMongoose';
import typeStorage from '../../../typeStorage';

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
      // $FlowFixMe
      expect(() => filterHelperArgs({})).toThrowError('should be instance of TypeComposer');
    });

    it('should throw error if second arg is not MongooseModel', () => {
      // $FlowFixMe
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

    it('should return filter with field _ids', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
      });
      const itc = new InputTypeComposer(args.filter.type);
      expect(itc.getFieldType('_ids')).toBeInstanceOf(GraphQLList);
      expect(itc.getFieldType('_ids').ofType).toBe(GraphQLMongoID);
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
    let spyFindFn;
    let resolveParams: any;

    beforeEach(() => {
      spyWhereFn = jest.fn(() => {
        return resolveParams.query;
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

    it('should call query.where if args.filter provided with _ids', () => {
      resolveParams.args = {
        filter: {
          age: 30,
          _ids: [1, 2, 3],
        },
      };
      filterHelper(resolveParams);
      expect(spyWhereFn.mock.calls).toEqual([[{ _id: { $in: [1, 2, 3] } }], [{ age: 30 }]]);
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
      expect(spyWhereFn.mock.calls).toEqual([
        [{ age: { $gt: 10, $lt: 20 } }],
        [{ active: true, age: { max: 30 } }],
      ]);
    });
  });
});
