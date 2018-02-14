/* @flow */

import { schemaComposer, InputTypeComposer } from 'graphql-compose';
import {
  addFieldWithOperators,
  processFilterOperators,
  OPERATORS_FIELDNAME,
} from '../filterOperators';
import { UserModel } from '../../../__mocks__/userModel';

describe('Resolver helper `filter` ->', () => {
  beforeEach(() => {
    schemaComposer.clear();
  });

  describe('addFieldWithOperators()', () => {
    let itc: InputTypeComposer;

    beforeEach(() => {
      itc = InputTypeComposer.create({
        name: 'UserFilterInput',
        fields: {
          _id: 'String',
          employment: 'String',
          name: 'String',
          age: 'Int',
          skills: ['String'],
        },
      });
    });

    it('should add OPERATORS_FIELDNAME to filterType', () => {
      addFieldWithOperators(itc, 'OperatorsTypeName', UserModel, {});
      expect(itc.hasField(OPERATORS_FIELDNAME)).toBe(true);
      expect(itc.getFieldTC(OPERATORS_FIELDNAME).getTypeName()).toBe('OperatorsTypeName');
    });

    it('should by default have only indexed fields', () => {
      addFieldWithOperators(itc, 'OperatorsTypeName', UserModel, {});
      const operatorsTC = itc.getFieldTC(OPERATORS_FIELDNAME);
      expect(operatorsTC.getFieldNames()).toEqual(
        expect.arrayContaining(['name', '_id', 'employment'])
      );
      expect(operatorsTC.hasField('age')).toBe(false);
    });

    it('should have only provided fields via options', () => {
      addFieldWithOperators(itc, 'OperatorsTypeName', UserModel, { age: ['lt'] });
      const operatorsTC = itc.getFieldTC(OPERATORS_FIELDNAME);
      expect(operatorsTC.hasField('age')).toBe(true);
    });

    it('should have only provided operators via options for field', () => {
      addFieldWithOperators(itc, 'OperatorsTypeName', UserModel, { age: ['lt', 'gte'] });
      const operatorsTC = itc.getFieldTC(OPERATORS_FIELDNAME);
      const ageTC = operatorsTC.getFieldTC('age');
      expect(ageTC.getFieldNames()).toEqual(expect.arrayContaining(['lt', 'gte']));
    });

    it('should reuse existed operatorsType', () => {
      const existedITC = itc.constructor.schemaComposer.getOrCreateITC('ExistedType');
      addFieldWithOperators(itc, 'ExistedType', UserModel, {});
      expect(itc.getFieldType(OPERATORS_FIELDNAME)).toBe(existedITC.getType());
    });
  });

  describe('processFilterOperators()', () => {
    it('should call query.find if args.filter.OPERATORS_FIELDNAME is provided', () => {
      const filter = {
        [OPERATORS_FIELDNAME]: { age: { gt: 10, lt: 20 } },
      };
      const spyWhereFn = jest.fn();
      const resolveParams: any = { query: { where: spyWhereFn } };
      processFilterOperators(filter, resolveParams);
      expect(spyWhereFn).toBeCalledWith({ age: { $gt: 10, $lt: 20 } });
    });
  });
});
