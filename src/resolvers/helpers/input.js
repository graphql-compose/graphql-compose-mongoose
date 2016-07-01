/* @flow */

import TypeComposer from 'graphql-compose/lib/typeComposer';
import { GraphQLNonNull, GraphQLObjectType } from 'graphql';

import type {
  GraphQLFieldConfigArgumentMap,
  inputHelperArgsOpts,
} from '../../definition';

export const inputHelperArgs = (
  gqType: GraphQLObjectType,
  opts: inputHelperArgsOpts
): GraphQLFieldConfigArgumentMap => {
  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error('First arg for inputHelperArgs() should be instance of GraphQLObjectType.');
  }

  if (!opts || !opts.inputTypeName) {
    throw new Error('You should provide non-empty `inputTypeName` in options.');
  }

  const composer = new TypeComposer(gqType);

  const inputTypeName: string = opts.inputTypeName;
  const inputComposer = composer.getInputTypeComposer().clone(inputTypeName);
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
