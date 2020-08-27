import type { Error as MongooseError } from 'mongoose';
import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';

interface Opts {
  /** Adds prefix to error `path` property. It's useful for createMany resolver which shows `idx` of broken record */
  pathPrefix?: string;
}

export class ValidationError extends Error {
  public errors: Array<{
    path: string;
    message: string;
    value: any;
  }>;

  constructor(data: MongooseError.ValidationError, opts?: Opts) {
    super(data.message);
    this.errors = [];
    Object.keys(data.errors).forEach((key) => {
      const e = data.errors[key];
      this.errors.push({
        path: opts?.pathPrefix ? `${opts?.pathPrefix}${e.path}` : e.path,
        message: e.message,
        value: e.value,
      });
    });

    (this as any).__proto__ = ValidationError.prototype;
  }
}

export function getValidationErrorOTC(schemaComposer: SchemaComposer<any>): ObjectTypeComposer {
  return schemaComposer.getOrCreateOTC('ValidationError', (otc) => {
    const ValidatorError = schemaComposer.getOrCreateOTC('ValidatorError', (otc) => {
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

    otc.addFields({
      message: {
        description: 'Combined error message from all validators',
        type: 'String',
      },
      errors: {
        description: 'List of validator errors',
        type: ValidatorError.NonNull.List,
      },
    });
  });
}
