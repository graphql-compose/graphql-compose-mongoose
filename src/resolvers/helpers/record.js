/* @flow */

import { TypeComposer, InputTypeComposer, graphql } from 'graphql-compose';
import typeStorage from '../../typeStorage';

import type { ComposeFieldConfigArgumentMap, RecordHelperArgsOpts } from '../../definition';

const { GraphQLNonNull } = graphql;

export const recordHelperArgs = (
  typeComposer: TypeComposer,
  opts?: RecordHelperArgsOpts
): ComposeFieldConfigArgumentMap => {
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('First arg for recordHelperArgs() should be instance of TypeComposer.');
  }

  if (!opts || !opts.recordTypeName) {
    throw new Error('You should provide non-empty `recordTypeName` in options.');
  }

  const recordTypeName: string = opts.recordTypeName;

  const recordComposer = new InputTypeComposer(
    typeStorage.getOrSet(
      recordTypeName,
      typeComposer.getInputTypeComposer().clone(recordTypeName).getType()
    )
  );
  if (opts && opts.removeFields) {
    recordComposer.removeField(opts.removeFields);
  }

  if (opts && opts.requiredFields) {
    recordComposer.makeRequired(opts.requiredFields);
  }

  return {
    record: {
      name: 'record',
      type: opts.isRequired
        ? new GraphQLNonNull(recordComposer.getType())
        : recordComposer.getType(),
    },
  };
};
