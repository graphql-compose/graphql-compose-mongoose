import type { Error as MongooseError } from 'mongoose';
import type { Document } from 'mongoose';

export type Validation = {
  path: string;
  message: string;
  value: any;
};

export type Validations = Array<Validation>;

export type ValidationsWithMessage = {
  message: string;
  errors: Array<Validation>;
};

export type ManyValidations = Array<ValidationsWithMessage | null>;

export type ManyValidationsWithMessage = {
  message: string;
  errors: ManyValidations;
};

export async function validationsForDocument(
  doc: Document
): Promise<ValidationsWithMessage | null> {
  const validations: MongooseError.ValidationError | null = await new Promise(function (resolve) {
    doc.validate(resolve);
  });

  return Promise.resolve(
    validations && validations.errors
      ? {
          message: validations.message,
          errors: Object.keys(validations.errors).map((key) => {
            const { message, value } = validations.errors[key];
            return {
              path: key,
              message,
              value,
            };
          }),
        }
      : null
  );
}
