/* @flow */

import { expect, spy } from 'chai';
import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { InputTypeComposer } from 'graphql-compose';
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
      expect(indexedFields).have.members(
        ['_id', 'employment', 'name']
      );
      expect(indexedFields).not.have.members(
        ['age', 'gender']
      );
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
      expect(inputTypeComposer.hasField(OPERATORS_FIELDNAME)).to.be.true;
    });

    it('should by default have only indexed fields', () => {
      addFieldsWithOperator('testTypeName', inputTypeComposer, UserModel, {});
      const operatorsType = inputTypeComposer.getFieldType(OPERATORS_FIELDNAME);
      const opComposer = new InputTypeComposer(operatorsType);
      expect(opComposer.getFieldNames()).to.have.members(['name', '_id', 'employment']);
    });

    it('should have only provided fields via options', () => {
      addFieldsWithOperator('testTypeName', inputTypeComposer, UserModel, { age: ['lt'] });
      const operatorsType = inputTypeComposer.getFieldType(OPERATORS_FIELDNAME);
      const opComposer = new InputTypeComposer(operatorsType);
      expect(opComposer.getFieldNames()).to.have.members(['age']);
    });

    it('should have only provided operators via options for field', () => {
      addFieldsWithOperator('testTypeName', inputTypeComposer, UserModel, { age: ['lt', 'gte'] });
      const operatorsType = inputTypeComposer.getFieldType(OPERATORS_FIELDNAME);
      const opComposer = new InputTypeComposer(operatorsType);
      const ageComposer = new InputTypeComposer(opComposer.getFieldType('age'));
      expect(ageComposer.getFieldNames()).to.have.members(['lt', 'gte']);
    });

    it('should reuse existed operatorsType', () => {
      const existedType = new GraphQLInputObjectType({
        name: 'ExistedType',
        fields: {},
      });
      typeStorage.set('ExistedType', existedType);
      addFieldsWithOperator('ExistedType', inputTypeComposer, UserModel, { age: ['lt'] });
      const operatorsType = inputTypeComposer.getFieldType(OPERATORS_FIELDNAME);
      expect(operatorsType).to.equal(existedType);
    });
  });

  describe('filterHelperArgs()', () => {
    it('should throw error if first arg is not TypeComposer', () => {
      expect(() => filterHelperArgs({}))
        .to.throw('should be instance of TypeComposer');
    });

    it('should throw error if second arg is not MongooseModel', () => {
      expect(() => filterHelperArgs(UserTypeComposer, {}))
        .to.throw('should be instance of MongooseModel');
    });

    it('should throw error if `filterTypeName` not provided in opts', () => {
      expect(() => filterHelperArgs(UserTypeComposer, UserModel))
        .to.throw('provide non-empty `filterTypeName`');
    });

    it('should return filter field', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
      });
      expect(args).has.property('filter');
      expect(args).has.deep.property('filter.name', 'filter');
      expect(args).has.deep.property('filter.type').instanceof(GraphQLInputObjectType);
    });

    it('should for opts.isRequired=true return GraphQLNonNull', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
        isRequired: true,
      });
      expect(args).has.property('filter');
      expect(args).has.deep.property('filter.name', 'filter');
      expect(args).has.deep.property('filter.type').instanceof(GraphQLNonNull);
    });

    it('should remove fields via opts.removeFields', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
        removeFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.hasField('name')).to.be.false;
      expect(inputTypeComposer.hasField('age')).to.be.false;
      expect(inputTypeComposer.hasField('gender')).to.be.true;
    });

    it('should set required fields via opts.requiredFields', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
        filterTypeName: 'FilterUserType',
        requiredFields: ['name', 'age'],
      });
      const inputTypeComposer = new InputTypeComposer(args.filter.type);
      expect(inputTypeComposer.getFieldType('name')).instanceof(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('age')).instanceof(GraphQLNonNull);
      expect(inputTypeComposer.getFieldType('gender')).not.instanceof(GraphQLNonNull);
    });

    it('should leave only indexed fields if opts.onlyIndexed=true', () => {
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
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
      const args = filterHelperArgs(UserTypeComposer, UserModel, {
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
    let spyWhereFn;
    let spyWhere2Fn;
    let spyFindFn;
    let resolveParams;

    beforeEach(() => {
      spyWhereFn = spy((queryObj) => {
        spyWhere2Fn = spy();
        return {
          ...UserModel.find(),
          where: spyWhere2Fn,
        };
      });

      spyFindFn = spy();
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
      expect(spyWhereFn).to.have.not.been.called();
    });

    it('should call query.where if args.filter is provided', () => {
      resolveParams.args = {
        filter: { name: 'nodkz' },
      };
      filterHelper(resolveParams);
      expect(spyWhereFn).to.have.been.called.with({ name: 'nodkz' });
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
      expect(spyWhereFn).to.have.been.called.with({
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
      expect(spyWhereFn).to.have.been.called.with(
        { age: { $gt: 10, $lt: 20 } }
      );
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
      expect(spyWhereFn).to.have.been.called.with(
        { age: { $gt: 10, $lt: 20 } }
      );
      expect(spyWhere2Fn).to.have.been.called.with(
        { age: { max: 30 }, active: true }
      );
    });
  });
});
