import { getValidationErrorOTC } from './ValidationError';
import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLError } from 'graphql';
import { ValidationsWithMessage } from '../resolvers/helpers/validate';

/**
 * If we validating multiple documents, we are using array with nulls in some positions.
 * It helps to indicate idx of input records which have validation errors; and `null` for records without errors.
 * So keep strict order in this array with input records array.
 */
export type ManyValidationsByIdx = Array<ValidationsWithMessage | null>;

export type ManyValidationsWithMessage = {
  message: string;
  errors: ManyValidationsByIdx;
};

export class ManyValidationError extends GraphQLError {
  public errors: ManyValidationsByIdx;

  constructor(data: ManyValidationsWithMessage) {
    super(data.message, undefined, undefined, undefined, undefined, undefined, {
      validations: data.errors,
    });

    this.errors = data.errors;
    (this as any).__proto__ = ManyValidationError.prototype;
  }
}

export function getManyValidationErrorOTC(schemaComposer: SchemaComposer<any>): ObjectTypeComposer {
  return schemaComposer.getOrCreateOTC('ManyValidationError', (otc) => {
    const ValidationError: ObjectTypeComposer = getValidationErrorOTC(schemaComposer);
    otc.addFields({
      message: {
        description: 'Combined error message from all validators',
        type: 'String',
      },
      errors: {
        description: 'List of validator errors',
        type: ValidationError.List,
      },
    });
  });
}
