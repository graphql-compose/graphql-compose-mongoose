import type { Document, Error as MongooseError } from 'mongoose';
import { version } from 'mongoose';
import { ValidationError } from '../../errors';

const versionNumber = Number(version.charAt(0));

export type ValidationErrorData = {
  path: string;
  message: string;
  value: any;
  /**
   * This `idx` property is used only for *Many operations.
   * It stores idx from received array of records which occurs Validation Error.
   */
  idx?: number;
};

export type ValidationsWithMessage = {
  message: string;
  errors: Array<ValidationErrorData>;
};

export async function validateDoc(doc: Document): Promise<ValidationsWithMessage | null> {
  const validations: MongooseError.ValidationError | null =
    versionNumber >= 7
      ? doc.validateSync()
      : await new Promise((resolve) => doc.validate(resolve as any));

  return validations?.errors
    ? {
        message: validations.message,
        errors: Object.keys(validations.errors).map((key) => {
          // transform object to array[{ path, message, value }, {}, ...]
          const { message, value } = validations.errors[key] as any;
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
 * all validator errors into one array with addition of `idx` property.
 * `idx` represent record index in array received from user.
 */
export async function validateManyAndThrow(docs: Document[]): Promise<void> {
  const combinedValidators: Array<ValidationErrorData> = [];
  let hasValidationError = false;

  for (let idx = 0; idx < docs.length; idx++) {
    const validations: ValidationsWithMessage | null = await validateDoc(docs[idx]);

    if (validations) {
      validations.errors.forEach((validatorError) => {
        combinedValidators.push({
          ...validatorError,
          idx,
        });
      });

      hasValidationError = true;
    }
  }

  if (hasValidationError) {
    throw new ValidationError({
      message: 'Nothing has been saved. Some documents contain validation errors',
      errors: combinedValidators,
    });
  }
}
