/* @flow */

import { SchemaComposer } from 'graphql-compose';
import type { TypeConverterOpts } from '../../../composeWithMongoose';
import {
  mergeCustomizationOptions,
  mergeFieldMaps,
  mergeStringAndStringArraysFields,
} from '../index';

const baseFields = {
  remove: ['id', 'friends', 'health', 'appearsIn'],
  only: ['id'],
};

const childFields = {
  remove: ['id', 'appearsIn', 'dob', 'health'],
  only: ['id'],
};

const expectedFields = {
  remove: ['id', 'friends', 'health', 'appearsIn', 'dob'],
  only: ['id'],
};

const baseInputTypeFields = {
  only: ['id', 'appearsIn'],
  remove: ['dob', 'gender'],
};

const childInputTypeFields = {
  only: ['id', 'friends', 'appearsIn'],
  remove: ['dob'],
  required: ['id', 'dob', 'gender'],
};

const expectedInputTypes = {
  only: ['id', 'appearsIn', 'friends'],
  remove: ['dob', 'gender'],
  required: ['id', 'dob', 'gender'],
};

const optsTypes = ['string', 'string[]'];

describe('mergeStringAndStringArraysFields()', () => {
  it('should concat two Arrays', () => {
    expect(
      mergeStringAndStringArraysFields(baseInputTypeFields.remove, childFields.only, optsTypes[0])
    ).toEqual([...baseInputTypeFields.remove, ...childFields.only]);
  });

  it('should combine two input strings into an array', () => {
    expect(
      mergeStringAndStringArraysFields(
        baseInputTypeFields.remove[0],
        baseInputTypeFields.remove[1],
        optsTypes[1]
      )
    ).toEqual(baseInputTypeFields.remove);
  });

  it('should combine an array and a string into an array', () => {
    expect(
      mergeStringAndStringArraysFields(
        childInputTypeFields.required[0],
        baseInputTypeFields.remove,
        optsTypes[0]
      )
    ).toEqual(childInputTypeFields.required);

    expect(
      mergeStringAndStringArraysFields(
        baseInputTypeFields.only,
        childInputTypeFields.only[1],
        optsTypes[0]
      )
    ).toEqual(expectedInputTypes.only);
  });

  it('should remove repeated fields from the array', () => {
    expect(
      mergeStringAndStringArraysFields(baseFields.remove, childFields.remove, optsTypes[0])
    ).toEqual(expectedFields.remove);

    expect(
      mergeStringAndStringArraysFields(undefined, childInputTypeFields.required, optsTypes[0])
    ).toEqual(expectedInputTypes.required);

    expect(
      mergeStringAndStringArraysFields(
        baseInputTypeFields.only,
        childInputTypeFields.only,
        optsTypes[0]
      )
    ).toEqual(expectedInputTypes.only);
  });

  it('should return an ARRAY of the defined if other one is undefined', () => {
    expect(mergeStringAndStringArraysFields(baseFields.remove, undefined, optsTypes[0])).toEqual(
      baseFields.remove
    );

    expect(mergeStringAndStringArraysFields(undefined, childFields.only, optsTypes[0])).toEqual(
      childFields.only
    );
  });

  it('should operate normally with ARRAY of optsTypes', () => {
    expect(mergeStringAndStringArraysFields(baseFields.remove, undefined, optsTypes)).toEqual(
      baseFields.remove
    );

    expect(mergeStringAndStringArraysFields(undefined, childFields.only, optsTypes)).toEqual(
      childFields.only
    );
  });

  it('should return child field if not amongst opsType', () => {
    expect(mergeStringAndStringArraysFields(baseFields.remove, undefined, 'boolean')).toEqual(
      undefined
    );

    expect(mergeStringAndStringArraysFields(undefined, childFields.only, 'number')).toEqual(
      childFields.only
    );
  });
});

describe('mergeFieldMaps()', () => {
  it('should merge fields', () => {
    expect(mergeFieldMaps(baseFields, childFields)).toEqual(expectedFields);
    expect(mergeFieldMaps(baseInputTypeFields, childInputTypeFields)).toEqual(expectedInputTypes);
  });
});

describe('mergeCustomizationOptions()', () => {
  const baseCustomOptions: TypeConverterOpts = {
    fields: baseFields,
    inputType: {
      name: 'BaseInput',
      description: 'Hello Base',
      fields: baseInputTypeFields,
    },
    resolvers: {
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
    },
  };

  const childCustomOptions: TypeConverterOpts = {
    fields: childFields,
    inputType: {
      name: 'ChildInputs',
      description: 'Hello Child',
      fields: childInputTypeFields,
    },
    resolvers: {
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
      updateById: {
        input: {
          removeFields: ['one', 'two', 'five'],
          requiredFields: ['eight', 'two', 'five'],
        },
      },
    },
  };

  const expected: TypeConverterOpts = {
    fields: expectedFields,
    inputType: {
      name: 'ChildInputs',
      description: 'Hello Child',
      fields: expectedInputTypes,
    },
    resolvers: {
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
      updateById: {
        input: {
          removeFields: ['one', 'two', 'five'],
          requiredFields: ['eight', 'two', 'five'],
        },
      },
    },
  };

  it('should merge customisation Options', () => {
    expect(mergeCustomizationOptions(baseCustomOptions, childCustomOptions)).toEqual(expected);
  });

  it('should produce error if using different schema composers', () => {
    try {
      const mergedOpts = mergeCustomizationOptions(
        { schemaComposer: new SchemaComposer() },
        { schemaComposer: new SchemaComposer() }
      );

      expect(mergedOpts).toBeFalsy();
    } catch (error) {
      expect(error.message).toBe(
        '[Discriminators] ChildModels should have same schemaComposer as its BaseModel'
      );
    }
  });
});
