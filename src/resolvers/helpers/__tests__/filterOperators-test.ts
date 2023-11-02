import mongoose from 'mongoose';
import { schemaComposer, InputTypeComposer, SchemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../../composeWithMongoose';
import { composeMongoose } from '../../../composeMongoose';

import {
  _createOperatorsField,
  addFilterOperators,
  processFilterOperators,
  OPERATORS_FIELDNAME,
} from '../filterOperators';
import { toMongoFilterDottedObject } from '../../../utils/toMongoDottedObject';
import { UserModel } from '../../../__mocks__/userModel';

let itc: InputTypeComposer<any>;

beforeEach(() => {
  schemaComposer.clear();
  schemaComposer.createInputTC({
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
      _createOperatorsField(itc, UserModel, {
        baseTypeName: 'TypeNameOperators',
      });
      expect(itc.hasField(OPERATORS_FIELDNAME)).toBe(true);
      expect(itc.getFieldTC(OPERATORS_FIELDNAME).getTypeName()).toBe('TypeNameOperators');
    });
    it('should have only provided fields via options', () => {
      _createOperatorsField(itc, UserModel, {
        baseTypeName: 'TypeNameOperators',
        operators: {
          age: ['lt'],
        },
      });
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      expect(operatorsTC.hasField('age')).toBe(true);
    });
    it('should have only provided operators via options for field', () => {
      _createOperatorsField(itc, UserModel, {
        baseTypeName: 'TypeNameOperators',
        operators: {
          age: ['lt', 'gte'],
        },
      });
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      const ageTC = operatorsTC.getFieldITC('age');
      expect(ageTC.getFieldNames()).toEqual(expect.arrayContaining(['lt', 'gte']));
    });
    it('should handle nested fields recursively', () => {
      _createOperatorsField(itc, UserModel, {
        baseTypeName: 'TypeNameOperators',
        operators: {
          age: ['lt', 'gte'],
          billingAddress: { country: ['nin'], state: ['in'] },
        },
      });
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      const billingAddressTC = operatorsTC.getFieldITC('billingAddress');

      expect(billingAddressTC.getFieldNames()).toEqual(expect.arrayContaining(['country']));
      const countryBillingAddressTC = billingAddressTC.getFieldITC('country');

      expect(countryBillingAddressTC.getFieldNames()).toEqual(expect.arrayContaining(['nin']));

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
      _createOperatorsField(itc, UserModel, { baseTypeName: 'ExistedType' });
      expect(itc.getFieldType(OPERATORS_FIELDNAME)).toBe(existedITC.getType());
    });
  });

  describe('addFilterOperators()', () => {
    it('should add OPERATORS_FIELDNAME via _createOperatorsField()', () => {
      addFilterOperators(itc, UserModel, { baseTypeName: 'UserFilter', suffix: 'Input' });
      expect(itc.hasField(OPERATORS_FIELDNAME)).toBe(true);
      expect(itc.getFieldTC(OPERATORS_FIELDNAME).getTypeName()).toBe('UserFilterOperatorsInput');
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
      expect(itc.getFieldITC('_operators').getFieldNames()).toEqual([
        '_id',
        'employment',
        'name',
        'billingAddress',
      ]);
      expect(itc.getFieldITC('_operators').getFieldITC('name').getFieldNames()).toEqual(['exists']);
    });
    it('should respect operators configuration and allow onlyIndexed', () => {
      // By default, when using onlyIndex, add all indexed fields, then if operators are supplied allow them as well
      addFilterOperators(itc, UserModel, {
        baseTypeName: 'User',
        onlyIndexed: true,
        operators: { name: ['exists'] },
      });
      const fields = itc.getFieldNames();
      expect(fields).toEqual(expect.arrayContaining(['name']));
      expect(itc.hasField('_operators')).toBe(true);
      expect(itc.getFieldITC('_operators').getFieldNames()).toEqual([
        '_id',
        'employment',
        'name',
        'billingAddress',
      ]);
      expect(itc.getFieldITC('_operators').getFieldITC('name').getFieldNames()).toEqual(['exists']);
      expect(itc.getFieldITC('_operators').getFieldITC('employment').getFieldNames()).toEqual([
        'gt',
        'gte',
        'lt',
        'lte',
        'ne',
        'in',
        'nin',
        'regex',
        'exists',
      ]);
      expect(itc.getFieldITC('_operators').getFields()).toEqual(
        expect.not.arrayContaining(['age'])
      );
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

  describe('integration tests', () => {
    it('should not throw error: must define one or more fields', async () => {
      const OrderDetailsSchema = new mongoose.Schema(
        {
          productID: Number,
          unitPrice: Number,
          quantity: Number,
          discount: Number,
        },
        {
          _id: false,
        }
      );

      const OrderSchema = new mongoose.Schema(
        {
          orderID: {
            type: Number,
            description: 'Order unique ID',
            unique: true,
          },
          customerID: String,
          employeeID: Number,
          orderDate: Date,
          requiredDate: Date,
          shippedDate: Date,
          shipVia: Number,
          freight: Number,
          shipName: String,
          details: {
            type: [OrderDetailsSchema],
            index: true,
            description: 'List of ordered products',
          },
        },
        {
          collection: 'northwind_orders',
        }
      );

      const OrderModel = mongoose.model<any>('Order', OrderSchema);

      const OrderTC = composeMongoose(OrderModel);

      const orderFindOneResolver = OrderTC.mongooseResolvers.findOne();

      const sc = new SchemaComposer();
      sc.Query.addFields({
        order: orderFindOneResolver,
      });

      const schema = sc.buildSchema();

      const res = await graphql.graphql({
        schema,
        source: `{ __typename }`,
      });

      expect(res?.errors?.[0]?.message).not.toBe(
        'Input Object type FilterFindOneOrderDetailsOperatorsInput must define one or more fields.'
      );
    });
  });
});
