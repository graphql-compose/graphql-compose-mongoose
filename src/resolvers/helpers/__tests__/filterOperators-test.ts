import { schemaComposer, InputTypeComposer } from 'graphql-compose';
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
  itc = schemaComposer.createInputTC({
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

describe('Resolver helper `filter` ->', () => {
  describe('_createOperatorsField()', () => {
    it('should add OPERATORS_FIELDNAME to filterType', () => {
      _createOperatorsField(itc, 'OperatorsTypeName', UserModel, {});
      expect(itc.hasField(OPERATORS_FIELDNAME)).toBe(true);
      expect(itc.getFieldTC(OPERATORS_FIELDNAME).getTypeName()).toBe('OperatorsTypeName');
    });

    it('should by default have only indexed fields', () => {
      _createOperatorsField(itc, 'OperatorsTypeName', UserModel, {});
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      expect(operatorsTC.getFieldNames()).toEqual(
        expect.arrayContaining(['name', '_id', 'employment'])
      );
      expect(operatorsTC.hasField('age')).toBe(false);
    });

    it('should have only provided fields via options', () => {
      _createOperatorsField(itc, 'OperatorsTypeName', UserModel, { age: ['lt'] });
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      expect(operatorsTC.hasField('age')).toBe(true);
    });

    it('should have only provided operators via options for field', () => {
      _createOperatorsField(itc, 'OperatorsTypeName', UserModel, { age: ['lt', 'gte'] });
      const operatorsTC = itc.getFieldITC(OPERATORS_FIELDNAME);
      const ageTC = operatorsTC.getFieldITC('age');
      expect(ageTC.getFieldNames()).toEqual(expect.arrayContaining(['lt', 'gte']));
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
      expect(itc.getFieldTC(OPERATORS_FIELDNAME).getTypeName()).toBe('OperatorsUserFilterInput');
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
  });

  describe('processFilterOperators()', () => {
    it('should call query.find if args.filter.OPERATORS_FIELDNAME is provided', () => {
      const filter = {
        [OPERATORS_FIELDNAME]: { age: { gt: 10, lt: 20 } },
      };
      expect(processFilterOperators(filter)).toEqual({ age: { $gt: 10, $lt: 20 } });
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
