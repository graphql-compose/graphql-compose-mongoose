/* @flow */

import { GraphQLNonNull } from 'graphql';
import { TypeComposer, InputTypeComposer } from 'graphql-compose';
import typeStorage from '../../typeStorage';

import type {
  GraphQLFieldConfigArgumentMap,
  recordHelperArgsOpts,
} from '../../definition';

export const recordHelperArgs = (
  typeComposer: TypeComposer,
  opts: recordHelperArgsOpts
): GraphQLFieldConfigArgumentMap => {
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
