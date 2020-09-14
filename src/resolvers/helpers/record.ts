import {
  ObjectTypeComposer,
  ObjectTypeComposerArgumentConfigMapDefinition,
  InputTypeComposer,
} from 'graphql-compose';
import { makeFieldsRecursiveNullable } from '../../utils/makeFieldsRecursiveNullable';
import { Document } from 'mongoose';

export type RecordHelperArgsOpts = {
  prefix?: string;
  suffix?: string;
  isRequired?: boolean;
  removeFields?: string[];
  requiredFields?: string[];
  /** Make all fields nullable by default. May be overridden by `requiredFields` property */
  allFieldsNullable?: boolean;
};

// for merging, discriminators merge-able only
export const getRecordHelperArgsOptsMap = (): Record<string, string> => ({
  isRequired: 'boolean',
  removeFields: 'string[]',
  requiredFields: 'string[]',
});

export function recordHelperArgs<TDoc extends Document = any>(
  tc: ObjectTypeComposer<TDoc, any>,
  opts?: RecordHelperArgsOpts
): ObjectTypeComposerArgumentConfigMapDefinition<{ record: any }> {
  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('First arg for recordHelperArgs() should be instance of ObjectTypeComposer.');
  }

  if (!opts) {
    throw new Error('You should provide non-empty options.');
  }

  const { prefix, suffix } = opts;

  let recordITC;
  const recordTypeName = `${prefix}${tc.getTypeName()}${suffix}`;
  const schemaComposer = tc.schemaComposer;
  if (schemaComposer.hasInstance(recordTypeName, InputTypeComposer)) {
    recordITC = schemaComposer.getITC(recordTypeName);
  } else {
    recordITC = tc.getInputTypeComposer().clone(recordTypeName);
  }

  if (opts && opts.allFieldsNullable) {
    makeFieldsRecursiveNullable(recordITC, { prefix, suffix });
  }

  if (opts && opts.removeFields) {
    recordITC.removeField(opts.removeFields);
  }

  if (opts && opts.requiredFields) {
    recordITC.makeRequired(opts.requiredFields);
  }

  return {
    record: {
      type: opts.isRequired ? recordITC.NonNull : recordITC,
    },
  };
}
