import {
  schemaComposer,
  ObjectTypeComposer,
  InputTypeComposer,
  NonNullComposer,
} from 'graphql-compose';
import { filterHelperArgs, filterHelper } from '../filter';
import { OPERATORS_FIELDNAME } from '../filterOperators';
import { UserModel } from '../../../__mocks__/userModel';
import { convertModelToGraphQL } from '../../../fieldsConverter';
import { prepareNestedAliases } from '../aliases';

describe('Resolver helper `filter` ->', () => {
  let UserTC: ObjectTypeComposer<any, any>;
  const aliases = prepareNestedAliases(UserModel.schema);

  beforeEach(() => {
    schemaComposer.clear();
    UserTC = convertModelToGraphQL(UserModel, 'User', schemaComposer);
  });

  describe('filterHelperArgs()', () => {
    it('should throw error if first arg is not ObjectTypeComposer', () => {
      expect(() => {
        const wrongArgs: any = [{}];
        // @ts-expect-error
        filterHelperArgs(...wrongArgs);
      }).toThrow('should be instance of ObjectTypeComposer');
    });

    it('should throw error if second arg is not MongooseModel', () => {
      expect(() => {
        const wrongArgs: any = [UserTC, {}];
        // @ts-expect-error
        filterHelperArgs(...wrongArgs);
      }).toThrow('should be instance of MongooseModel');
    });

    it('should throw error if `opts` is not provided', () => {
      expect(() => filterHelperArgs(UserTC, UserModel)).toThrow('provide non-empty options');
    });

    it('should return filter field', () => {
      const args = filterHelperArgs(UserTC, UserModel, {
        prefix: 'Filter',
        suffix: 'Type',
      });
      expect(args.filter.type).toBeInstanceOf(InputTypeComposer);
    });

    it('should for opts.isRequired=true return GraphQLNonNull', () => {
      const args = filterHelperArgs(UserTC, UserModel, {
        prefix: 'Filter',
        suffix: 'Type',
        isRequired: true,
      });
      expect(args.filter.type).toBeInstanceOf(NonNullComposer);
    });

    it('should remove fields via opts.removeFields', () => {
      const args = filterHelperArgs(UserTC, UserModel, {
        prefix: 'Filter',
        suffix: 'Type',
        removeFields: ['name', 'age'],
      });
      const itc = args.filter.type as InputTypeComposer;
      expect(itc.hasField('name')).toBe(false);
      expect(itc.hasField('age')).toBe(false);
      expect(itc.hasField('gender')).toBe(true);
    });

    it('should set required fields via opts.requiredFields', () => {
      const args = filterHelperArgs(UserTC, UserModel, {
        prefix: 'Filter',
        suffix: 'Type',
        requiredFields: ['name', 'age'],
      });
      const itc = args.filter.type as InputTypeComposer;
      expect(itc.getField('name').type).toBeInstanceOf(NonNullComposer);
      expect(itc.getField('age').type).toBeInstanceOf(NonNullComposer);
      expect(itc.getField('gender').type).not.toBeInstanceOf(NonNullComposer);
    });

    it('should leave only indexed fields if opts.onlyIndexed=true', () => {
      const args = filterHelperArgs(UserTC, UserModel, {
        prefix: 'Filter',
        suffix: 'Type',
        onlyIndexed: true,
      });
      const itc = args.filter.type as InputTypeComposer;
      expect(itc.hasField('_id')).toBe(true);
      expect(itc.hasField('name')).toBe(true);
      expect(itc.hasField('age')).toBe(false);
      expect(itc.hasField('gender')).toBe(false);
    });

    it('should opts.onlyIndexed=true and opts.removeFields works together', () => {
      const args = filterHelperArgs(UserTC, UserModel, {
        prefix: 'Filter',
        suffix: 'Type',
        onlyIndexed: true,
        removeFields: ['name'],
      });
      const itc = args.filter.type as InputTypeComposer;
      expect(itc.hasField('_id')).toBe(true);
      expect(itc.hasField('name')).toBe(false);
      expect(itc.hasField('age')).toBe(false);
      expect(itc.hasField('gender')).toBe(false);
    });

    it('should make nullable all nested fields and clone all input object types', () => {
      // User.contacts.email is required field, so make it nullable with new type generation
      const args = filterHelperArgs(UserTC, UserModel, {
        prefix: 'Filter',
        suffix: 'Input',
      });
      const itc = args.filter.type as InputTypeComposer;
      const contactsITC = itc.getFieldITC('contacts');

      expect(contactsITC.isFieldNonNull('email')).toBe(false);

      // And name of new cloned type should be correct with deduped suffix/prefix
      expect(contactsITC.getTypeName()).toBe('FilterUserContactsInput');
    });
  });

  describe('filterHelper()', () => {
    let spyWhereFn: jest.Mock<any, any>;
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
      filterHelper(resolveParams, aliases);
      expect(spyWhereFn).not.toBeCalled();
    });

    it('should call query.where if args.filter is provided', () => {
      resolveParams.args = {
        filter: { name: 'nodkz' },
      };
      filterHelper(resolveParams, aliases);
      expect(spyWhereFn).toBeCalledWith({ n: 'nodkz' });
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
      filterHelper(resolveParams, aliases);
      expect(spyWhereFn).toBeCalledWith({
        'n.first': 'Pavel',
        age: 30,
      });
    });

    it('should call query.find if args.filter.OPERATORS_FIELDNAME is provided', () => {
      resolveParams.args = {
        filter: {
          [OPERATORS_FIELDNAME]: { age: { gt: 10, lt: 20 } },
        },
      };
      filterHelper(resolveParams, aliases);
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

      filterHelper(resolveParams, aliases);
      expect(spyWhereFn.mock.calls).toEqual([
        [{ age: { $gt: 10, $lt: 20 } }],
        [{ active: true, age: { max: 30 } }],
      ]);
    });
  });
});
