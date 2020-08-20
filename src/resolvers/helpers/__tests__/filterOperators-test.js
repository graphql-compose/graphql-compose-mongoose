/* @flow */
import mongoose from 'mongoose';
import { schemaComposer, InputTypeComposer } from 'graphql-compose';
import { composeWithMongoose } from '../../../composeWithMongoose';

import {
  _createOperatorsField,
  addFilterOperators,
  processFilterOperators,
  OPERATORS_FIELDNAME,
} from '../filterOperators';
import { toMongoFilterDottedObject } from '../../../utils/toMongoDottedObject';
import { UserModel } from '../../../__mocks__/userModel';

let itc: InputTypeComposer<any>;
let addressItc: InputTypeComposer<any>;

beforeEach(() => {
  schemaComposer.clear();
  addressItc = schemaComposer.createInputTC({
    name: 'BillingAddressUserFieldInput',
    fields: {
      street: 'String',
      state: 'String',
      country: 'String',
    },
  });
  itc = schemaComposer.createInputTC({
    name: 'UserFilterInput',
    fields: {
      _id: 'String',
      employment: 'String',
      name: 'String',
      age: 'Int',
      skills: ['String'],
      billingAddress: 'BillingAddressUserFieldInput',
    },
  });
});

describe('Resolver helper `filter` ->', () => {
  describe('_createOperatorsField()', () => {
    it('should add OPERATORS_FIELDNAME to filterType', () => {
      _createOperatorsField(itc, 'OperatorsTypeName', UserModel, {});
      expect(itc.hasField(OPERATORS_FIELDNAME)).toBe(true);
      expect(itc.getFieldTC(OPERATORS_FIELDNAME).getTypeName()).toBe('OperatorsTypeName');
    });
    it('should have only provided fields via options', () => {
      _createOperatorsField(itc, 'OperatorsTypeName', UserModel, { operators: { age: ['lt'] } });
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      expect(operatorsTC.hasField('age')).toBe(true);
    });
    it('should have only provided operators via options for field', () => {
      _createOperatorsField(itc, 'OperatorsTypeName', UserModel, {
        operators: { age: ['lt', 'gte'] },
      });
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      const ageTC = operatorsTC.getFieldITC('age');
      expect(ageTC.getFieldNames()).toEqual(expect.arrayContaining(['lt', 'gte']));
    });
    it('should have recurse schema', () => {
      _createOperatorsField(itc, 'OperatorsTypeName', UserModel, {
        operators: {
          age: ['lt', 'gte'],
          billingAddress: { country: ['in[]'], state: ['in'] },
        },
      });
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      const billingAddressTC = operatorsTC.getFieldITC('billingAddress');

      expect(billingAddressTC.getFieldNames()).toEqual(expect.arrayContaining(['country']));
      const countryBillingAddressTC = billingAddressTC.getFieldITC('country');

      expect(countryBillingAddressTC.getFieldNames()).toEqual(expect.arrayContaining(['in']));

      expect(billingAddressTC.getFieldNames()).toEqual(expect.arrayContaining(['state']));
      const stateBillingAddressTC = billingAddressTC.getFieldITC('state');
      expect(stateBillingAddressTC.getFieldNames()).toEqual(expect.arrayContaining(['in']));
    });

    it('should not recurse on circular schemas to avoid maximum call stack size exceeded', () => {
      const PersonSchema = new mongoose.Schema({
        name: String,
      });
      PersonSchema.add({
        spouse: PersonSchema,
        friends: [PersonSchema],
      });
      const PersonModel = mongoose.model('Person', PersonSchema);
      const tc = composeWithMongoose(PersonModel);
      expect(tc.getFieldNames()).toEqual(
        expect.arrayContaining(['_id', 'name', 'spouse', 'friends'])
      );
    });
    it('should reuse existed operatorsType', () => {
      const existedITC = itc.schemaComposer.getOrCreateITC('ExistedType');
      _createOperatorsField(itc, 'ExistedType', UserModel, {});
      expect(itc.getFieldType(OPERATORS_FIELDNAME)).toBe(existedITC.getType());
    });
  });

  describe('addFilterOperators()', () => {
    it('should add OPERATORS_FIELDNAME via _createOperatorsField()', () => {
      addFilterOperators(itc, UserModel, {});
      expect(itc.hasField(OPERATORS_FIELDNAME)).toBe(true);
      expect(itc.getFieldTC(OPERATORS_FIELDNAME).getTypeName()).toBe('Operators');
    });
    it('should add OR field', () => {
      addFilterOperators(itc, UserModel, {});
      const fields = itc.getFieldNames();
      expect(fields).toEqual(expect.arrayContaining(['OR', 'name', 'age']));
      expect(itc.getFieldTC('OR').getType()).toBe(itc.getType());
    });
    it('should add AND field', () => {
      addFilterOperators(itc, UserModel, {});
      const fields = itc.getFieldNames();
      expect(fields).toEqual(expect.arrayContaining(['AND', 'name', 'age']));
      expect(itc.getFieldTC('AND').getType()).toBe(itc.getType());
    });
    it('should respect operators configuration', () => {
      // onlyIndexed: false by default
      addFilterOperators(itc, UserModel, { operators: { name: ['exists'] } });
      const fields = itc.getFieldNames();
      expect(fields).toEqual(expect.arrayContaining(['name']));
      expect(itc.hasField('_operators')).toBe(true);
      expect(itc.getFieldTC('_operators').getFieldNames()).toEqual(['name']);
      expect(itc.getFieldTC('_operators').getFieldTC('name').getFieldNames()).toEqual(['exists']);
    });
    it('should respect operators configuration and allow onlyIndex', () => {
      addFilterOperators(itc, UserModel, { onlyIndexed: true, operators: { name: ['exists'] } });
      const fields = itc.getFieldNames();
      expect(fields).toEqual(expect.arrayContaining(['name']));
      expect(itc.hasField('_operators')).toBe(true);
      expect(itc.getFieldTC('_operators').getFieldNames()).toEqual([
        '_id',
        'employment',
        'name',
        'age',
        'skills',
        'billingAddress',
      ]);
      expect(itc.getFieldTC('_operators').getFieldTC('name').getFieldNames()).toEqual(['exists']);
    });
  });

  describe('processFilterOperators()', () => {
    it('should call query.find if args.filter.OPERATORS_FIELDNAME is provided', () => {
      const filter = {
        [OPERATORS_FIELDNAME]: { age: { gt: 10, lt: 20 } },
      };
      expect(processFilterOperators(filter)).toEqual({ age: { $gt: 10, $lt: 20 } });
    });
    it('should process nested fields', () => {
      const filter = {
        [OPERATORS_FIELDNAME]: {
          age: { gt: 10, lt: 20 },
          address: { country: { in: ['US'] } },
        },
      };
      expect(processFilterOperators(filter)).toEqual({
        age: { $gt: 10, $lt: 20 },
        address: { country: { $in: ['US'] } },
      });
    });
    it('should convert OR query', () => {
      const filter = {
        OR: [
          {
            name: {
              first: 'Pavel',
            },
            age: 30,
          },
          {
            age: 40,
          },
        ],
      };
      expect(toMongoFilterDottedObject(processFilterOperators(filter))).toEqual({
        $or: [
          { age: 30, 'name.first': 'Pavel' },
          {
            age: 40,
          },
        ],
      });
    });
    it('should convert AND query', () => {
      const filter = {
        AND: [
          {
            name: {
              first: 'Pavel',
            },
          },
          {
            age: 40,
          },
        ],
      };
      expect(toMongoFilterDottedObject(processFilterOperators(filter))).toEqual({
        $and: [
          { 'name.first': 'Pavel' },
          {
            age: 40,
          },
        ],
      });
    });
    it('should convert nested AND/OR query', () => {
      const filter = {
        OR: [
          {
            AND: [
              { name: { first: 'Pavel' } },
              {
                OR: [{ age: 30 }, { age: 35 }],
              },
            ],
          },
          {
            age: 40,
          },
        ],
      };
      expect(toMongoFilterDottedObject(processFilterOperators(filter))).toEqual({
        $or: [
          {
            $and: [
              { 'name.first': 'Pavel' },
              {
                $or: [{ age: 30 }, { age: 35 }],
              },
            ],
          },
          {
            age: 40,
          },
        ],
      });
    });
  });
});
