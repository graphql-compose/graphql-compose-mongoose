/* @flow */

import TypeComposer from '../../../../graphql-compose/src/typeComposer';
import { GraphQLNonNull } from 'graphql';

import type {
  GraphQLObjectType,
  GraphQLFieldConfigArgumentMap,
} from '../../definition';

export type inputHelperArgsGenOpts = {
  inputTypeName: string,
  removeFields?: string | string[],
  requiredFields?: string | string[],
  isRequired?: boolean,
};

export const inputHelperArgsGen = (
  gqType: GraphQLObjectType,
  opts: inputHelperArgsGenOpts
): GraphQLFieldConfigArgumentMap => {
  const composer = new TypeComposer(gqType);

  if (!opts.inputTypeName) {
    throw new Error('You should provide `inputTypeName` in options.');
  }

  const inputComposer = composer.getInputTypeComposer().clone(opts.inputTypeName);
  if (opts.removeFields) {
    inputComposer.removeField(opts.removeFields);
  }

  if (opts.requiredFields) {
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
