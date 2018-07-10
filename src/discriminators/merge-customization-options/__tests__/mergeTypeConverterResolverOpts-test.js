/* @flow */

import type { TypeConverterResolversOpts } from '../../../composeWithMongoose';
import {} from '../index';
import {
  mergeTypeConverterResolverOpts,
  mergePrimitiveTypeFields,
  mergeMapTypeFields,
  mergeFilterOperatorsOptsMap,
} from '../utils/mergeTypeConverterResolversOpts';

const baseConverterResolverOpts: TypeConverterResolversOpts = {
  findMany: {
    limit: { defaultValue: 20 },
    // sort: false,
    skip: false,
    filter: {
      isRequired: true,
      removeFields: ['id', 'dob'],
      operators: {
        one: ['gt', 'gte', 'lt'],
        two: ['gt', 'gte', 'lt', 'in[]', 'nin[]'],
      },
    },
  },
  findById: false,
};

const childConverterResolverOpts: TypeConverterResolversOpts = {
  findMany: {
    limit: { defaultValue: 50 },
    sort: false,
    // skip: false,
    filter: {
      removeFields: ['gender', 'dob', 'age'],
      operators: {
        one: ['gt', 'lte', 'ne', 'in[]', 'nin[]'],
        two: ['gt', 'gte', 'lt', 'lte', 'ne'],
        three: ['gte', 'lt'],
      },
    },
  },
};

const expectedConverterResolverOpts: TypeConverterResolversOpts = {
  findMany: {
    limit: { defaultValue: 50 },
    sort: false,
    skip: false,
    filter: {
      isRequired: true,
      removeFields: ['id', 'dob', 'gender', 'age'],
      operators: {
        one: ['gt', 'gte', 'lt', 'lte', 'ne', 'in[]', 'nin[]'],
        two: ['gt', 'gte', 'lt', 'in[]', 'nin[]', 'lte', 'ne'],
        three: ['gte', 'lt'],
      },
    },
  },
  findById: false,
};

describe('mergeTypeConverterResolverOpts()', () => {
  it('should merge TypeConverterResolverOpts', () => {
    expect(
      mergeTypeConverterResolverOpts(baseConverterResolverOpts, childConverterResolverOpts)
    ).toEqual(expectedConverterResolverOpts);
  });

  describe('mergeFilterOperatorsOptsMap()', () => {
    it('should merge FilterOperatorsOptsMap', () => {
      expect(
        mergeFilterOperatorsOptsMap(
          ((baseConverterResolverOpts.findMany: any).filter.operators: any),
          ((childConverterResolverOpts.findMany: any).filter.operators: any)
        )
      ).toEqual((expectedConverterResolverOpts.findMany: any).filter.operators);
    });
  });

  describe('mergePrimitiveTypeFields()', () => {
    const opsTypes = ['string', 'boolean'];

    it('should merge [base false] and [child undefined] to [false]', () => {
      expect(mergePrimitiveTypeFields(false, undefined, opsTypes[1])).toEqual(false);
    });

    it('should merge [base true] and [child undefined] to [true]', () => {
      expect(mergePrimitiveTypeFields(true, undefined, opsTypes[1])).toEqual(true);
    });

    it('should merge [base undefined] and [child true] to [true]', () => {
      expect(mergePrimitiveTypeFields(undefined, true, opsTypes[1])).toEqual(true);
    });

    it('should merge [base undefined] and [child false] to [false]', () => {
      expect(mergePrimitiveTypeFields(undefined, false, opsTypes[1])).toEqual(false);
    });

    it('should merge [base undefined] and [child undefined] to [undefined]', () => {
      expect(mergePrimitiveTypeFields(undefined, undefined, opsTypes[1])).toEqual(undefined);
    });

    it('should merge with correct results if opsTypes is an array containing "boolean"', () => {
      expect(mergePrimitiveTypeFields(false, undefined, opsTypes)).toEqual(false);
      expect(mergePrimitiveTypeFields(undefined, false, opsTypes)).toEqual(false);
      expect(mergePrimitiveTypeFields(undefined, undefined, opsTypes)).toEqual(undefined);
    });

    it('should return input child field if optsTypes does not have "boolean"', () => {
      expect(mergePrimitiveTypeFields(undefined, undefined, opsTypes[0])).toEqual(undefined);
      expect(mergePrimitiveTypeFields(undefined, false, opsTypes[0])).toEqual(false);
      expect(mergePrimitiveTypeFields(undefined, true, opsTypes)).toEqual(true);
    });
  });

  describe('mergeMapTypeFields()', () => {
    const optsTypes = {
      isRequired: 'boolean',
    };

    it('should merge Map type fields', () => {
      expect(
        mergeMapTypeFields(
          (baseConverterResolverOpts.findMany: any).filter,
          (childConverterResolverOpts.findMany: any).filter,
          optsTypes
        )
      ).toEqual((expectedConverterResolverOpts.findMany: any).filter);
    });
  });
});
