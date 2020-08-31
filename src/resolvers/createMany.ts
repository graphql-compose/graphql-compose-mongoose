import type { ObjectTypeComposer, Resolver } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { recordHelperArgs } from './helpers';
import type { GenResolverOpts } from './index';
import { addManyErrorCatcherField } from './helpers/addErrorCatcherField';
import { ManyValidationError } from '../errors';
import {
  validationsForDocument,
  ValidationsWithMessage,
  ManyValidations,
  ManyValidationsWithMessage,
} from '../errors/validationsForDocument';

export default function createMany<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext, any> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver createMany() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver createMany() should be instance of ObjectTypeComposer.'
    );
  }

  const tree = model.schema.obj;
  const requiredFields = [];
  for (const field in tree) {
    if (tree.hasOwnProperty(field)) {
      const fieldOptions = tree[field];
      if (fieldOptions.required && typeof fieldOptions.required !== 'function') {
        requiredFields.push(field);
      }
    }
  }

  const outputTypeName = `CreateMany${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      recordIds: {
        type: '[MongoID!]!',
        description: 'Created document IDs',
      },
      records: {
        type: tc.NonNull.List,
        description: 'Created documents',
      },
      createCount: {
        type: 'Int!',
        description: 'Number of created documents',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver({
    name: 'createMany',
    kind: 'mutation',
    description: 'Creates Many documents with mongoose defaults, setters, hooks and validation',
    type: outputType,
    args: {
      records: {
        type: (recordHelperArgs(tc, {
          prefix: 'CreateMany',
          suffix: 'Input',
          removeFields: ['id', '_id'],
          isRequired: true,
          requiredFields,
          ...(opts && opts.records),
        }) as any).record.type.List.NonNull,
      },
    },
    resolve: async (resolveParams) => {
      const recordData = resolveParams?.args?.records;

      if (!Array.isArray(recordData) || recordData.length === 0) {
        throw new Error(
          `${tc.getTypeName()}.createMany resolver requires args.records to be an Array and must contain at least one record`
        );
      }

      for (const record of recordData) {
        if (!(typeof record === 'object') || Object.keys(record).length === 0) {
          throw new Error(
            `${tc.getTypeName()}.createMany resolver requires args.records to contain non-empty records, with at least one value`
          );
        }
      }

      const manyValidations: ManyValidations = [];
      const docs = [];

      for (const record of recordData) {
        // eslint-disable-next-line new-cap
        let doc = new model(record);
        if (resolveParams.beforeRecordMutate) {
          doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
        }

        const validations: ValidationsWithMessage | null = await validationsForDocument(doc);

        manyValidations.push(validations ? validations : null);
        docs.push(doc);
      }

      const hasValidationError = !manyValidations.every((error) => error === null);
      if (!hasValidationError) {
        await model.create(docs);
      }

      if (hasValidationError) {
        const manyValidationsWithMessage: ManyValidationsWithMessage = {
          message: 'Cannot createMany some documents contain errors',
          errors: manyValidations,
        };

        if (!resolveParams?.projection?.error) {
          // if client does not request `errors` field we throw Exception on to level
          throw new ManyValidationError(manyValidationsWithMessage);
        }
        return {
          records: null,
          recordIds: null,
          error: {
            name: 'ManyValidationError',
            ...manyValidationsWithMessage,
          },
          createCount: 0,
        };
      } else {
        return {
          records: docs,
          recordIds: docs.map((doc) => doc._id),
          createCount: docs.length,
        };
      }
    },
  });

  // Add `error` field to payload which can catch resolver Error
  // and return it in mutation payload
  addManyErrorCatcherField(resolver);

  return resolver;
}
