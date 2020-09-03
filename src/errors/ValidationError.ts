import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';
import type { ValidationErrorData, ValidationsWithMessage } from '../resolvers/helpers/validate';

export class ValidationError extends Error {
  public errors: ValidationErrorData[];

  constructor(validation: ValidationsWithMessage) {
    super(validation.message);
    this.errors = validation.errors;
    (this as any).__proto__ = ValidationError.prototype;
  }
}

export function getValidatorErrorOTC(schemaComposer: SchemaComposer<any>): ObjectTypeComposer {
  return schemaComposer.getOrCreateOTC('ValidatorError', (otc) => {
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
      idx: {
        description:
          'Input record idx in array which occurs the validation error. This `idx` is useful for createMany operation. For singular operations it always be 0. For *Many operations `idx` represents record index in array received from user.',
        type: 'Int!',
        resolve: (s: any) => s.idx || 0,
      },
    });
  });
}

export function getValidationErrorOTC(schemaComposer: SchemaComposer<any>): ObjectTypeComposer {
  return schemaComposer.getOrCreateOTC('ValidationError', (otc) => {
    otc.addFields({
      message: {
        description: 'Combined error message from all validators',
        type: 'String',
      },
      errors: {
        description: 'List of validator errors',
        type: getValidatorErrorOTC(schemaComposer).NonNull.List,
      },
    });
  });
}
