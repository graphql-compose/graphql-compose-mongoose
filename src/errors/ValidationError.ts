import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLError } from 'graphql';

import type { Validations, ValidationsWithMessage } from './validationsForDocument';

export class ValidationError extends GraphQLError {
  public errors: Validations;

  constructor(validation: ValidationsWithMessage) {
    super(validation.message, undefined, undefined, undefined, undefined, undefined, {
      validations: validation.errors,
    });

    this.errors = validation.errors;

    (this as any).__proto__ = ValidationError.prototype;
  }
}

export function getValidationOTC(schemaComposer: SchemaComposer<any>): ObjectTypeComposer {
  return schemaComposer.getOrCreateOTC('Validation', (otc) => {
    otc.addFields({
      message: {
        description: 'Validation error message',
        type: 'String',
      },
      path: {
        description: 'Source of the validation error from the model path',
        type: 'String',
      },
      value: {
        description: 'Field value which occurs the validation error',
        type: 'JSON',
      },
    });
  });
}

export function getValidationErrorOTC(schemaComposer: SchemaComposer<any>): ObjectTypeComposer {
  return schemaComposer.getOrCreateOTC('ValidationError', (otc) => {
    const Validation = getValidationOTC(schemaComposer);
    otc.addFields({
      message: {
        description: 'Combined error message from all validators',
        type: 'String',
      },
      errors: {
        description: 'List of validator errors',
        type: Validation.NonNull.List,
      },
    });
  });
}
