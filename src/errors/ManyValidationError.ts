import { getValidationErrorOTC } from './ValidationError';
import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLError } from 'graphql';

import { ValidationsWithMessage, ManyValidationsWithMessage } from './validationsForDocument';

export class ManyValidationError extends GraphQLError {
  public errors: Array<ValidationsWithMessage | null>;

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
