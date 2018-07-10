/* @flow */

import type { TypeComposer, ComposeFieldConfigArgumentMap } from 'graphql-compose';

export type RecordHelperArgsOpts = {
  recordTypeName?: string,
  isRequired?: boolean,
  removeFields?: string[],
  requiredFields?: string[],
};

// for merging, discriminators merge-able only
export const getRecordHelperArgsOptsMap = () => ({
  isRequired: 'boolean',
  removeFields: 'string[]',
  requiredFields: 'string[]',
});

export const recordHelperArgs = (
  tc: TypeComposer,
  opts?: RecordHelperArgsOpts
): ComposeFieldConfigArgumentMap => {
  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('First arg for recordHelperArgs() should be instance of TypeComposer.');
  }

  if (!opts || !opts.recordTypeName) {
    throw new Error('You should provide non-empty `recordTypeName` in options.');
  }

  const recordTypeName: string = opts.recordTypeName;

  let recordITC;
  const schemaComposer = tc.constructor.schemaComposer;
  if (schemaComposer.hasInstance(recordTypeName, schemaComposer.InputTypeComposer)) {
    recordITC = schemaComposer.getITC(recordTypeName);
  } else {
    recordITC = tc.getInputTypeComposer().clone(recordTypeName);
  }

  if (opts && opts.removeFields) {
    recordITC.removeField(opts.removeFields);
  }

  if (opts && opts.requiredFields) {
    recordITC.makeRequired(opts.requiredFields);
  }

  return {
    record: {
      type: opts.isRequired ? recordITC.getTypeNonNull() : recordITC.getType(),
    },
  };
};
