import type { Error as MongooseError } from 'mongoose';
import type { Document } from 'mongoose';
import { ValidationError, ManyValidationError, ManyValidationsByIdx } from '../../errors';

export type ValidationErrorData = {
  path: string;
  message: string;
  value: any;
};

export type ValidationsWithMessage = {
  message: string;
  errors: Array<ValidationErrorData>;
};

export async function validateDoc(doc: Document): Promise<ValidationsWithMessage | null> {
  const validations: MongooseError.ValidationError | null = await new Promise((resolve) => {
    doc.validate(resolve);
  });

  return validations?.errors
    ? {
        message: validations.message,
        errors: Object.keys(validations.errors).map((key) => {
          // transform object to array[{ path, message, value }, {}, ...]
          const { message, value } = validations.errors[key];
          return {
            path: key,
            message,
            value,
          };
        }),
      }
    : null;
}

/**
 * Make async validation for mongoose document.
 * And if it has validation errors then throw one Error with embedding all validation errors into it.
 */
export async function validateAndThrow(doc: Document): Promise<void> {
  const validations: ValidationsWithMessage | null = await validateDoc(doc);
  if (validations) {
    throw new ValidationError(validations);
  }
}

/**
 * Make async validation for array of mongoose documents.
 * And if they have validation errors then throw one Error with embedding
 * all validation errors for every document separately.
 * If document does not have error then in embedded errors' array will
 * be `null` at the same idx position.
 */
export async function validateManyAndThrow(docs: Document[]): Promise<void> {
  const manyValidations: ManyValidationsByIdx = [];
  let hasValidationError = false;

  for (const doc of docs) {
    const validations: ValidationsWithMessage | null = await validateDoc(doc);

    if (validations) {
      manyValidations.push(validations);
      hasValidationError = true;
    } else {
      manyValidations.push(null);
    }
  }

  if (hasValidationError) {
    throw new ManyValidationError({
      message: 'Some documents contain validation errors',
      errors: manyValidations,
    });
  }
}
