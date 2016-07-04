/* @flow */

import { TypeComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql';

import type {
  GraphQLFieldConfigArgumentMap,
  inputHelperArgsOpts,
} from '../../definition';

export const inputHelperArgs = (
  typeComposer: TypeComposer,
  opts: inputHelperArgsOpts
): GraphQLFieldConfigArgumentMap => {
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('First arg for inputHelperArgs() should be instance of TypeComposer.');
  }

  if (!opts || !opts.inputTypeName) {
    throw new Error('You should provide non-empty `inputTypeName` in options.');
  }

  const inputTypeName: string = opts.inputTypeName;
  const inputComposer = typeComposer.getInputTypeComposer().clone(inputTypeName);
  if (opts && opts.removeFields) {
    inputComposer.removeField(opts.removeFields);
  }

  if (opts && opts.requiredFields) {
    inputComposer.makeFieldsRequired(opts.requiredFields);
  }

  return {
    input: {
      name: 'input',
      type: opts.isRequired
        ? new GraphQLNonNull(inputComposer.getType())
        : inputComposer.getType(),
    },
  };
};
