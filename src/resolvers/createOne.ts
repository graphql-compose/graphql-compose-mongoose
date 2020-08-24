import { Resolver, ObjectTypeComposer, mapEachKey } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { getOrCreateErrorInterface } from '../utils/getOrCreateErrorInterface';
import { recordHelperArgs } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { GraphQLError } from 'graphql';

export default function createOne<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver createOne() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver createOne() should be instance of ObjectTypeComposer.'
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

  getOrCreateErrorInterface(tc);

  const outputTypeName = `CreateOne${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Created document ID',
      },
      record: {
        type: tc,
        description: 'Created document',
      },
      errors: {
        type: '[ErrorInterface]',
        description: 'Errors that may occur',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver({
    name: 'createOne',
    kind: 'mutation',
    description: 'Create one document with mongoose defaults, setters, hooks and validation',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        prefix: 'CreateOne',
        suffix: 'Input',
        removeFields: ['id', '_id'],
        isRequired: true,
        requiredFields,
        ...(opts && opts.record),
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || {};

      if (!(typeof recordData === 'object') || Object.keys(recordData).length === 0) {
        throw new Error(
          `${tc.getTypeName()}.createOne resolver requires at least one value in args.record`
        );
      }

      let doc = new model(recordData);
      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
        if (!doc) return null;
      }

      const validationErrors: any = await new Promise(function (resolve) {
        doc.validate(null, null, resolve);
      });
      const errors: {
        path: string;
        message: string;
        value: any;
      }[] = [];

      if (validationErrors && validationErrors.errors) {
        if (!resolveParams?.projection?.errors) {
          // if client does not request `errors` field we throw Exception on to level
          throw new GraphQLError(
            validationErrors.message,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            {
              validationErrors: mapEachKey(validationErrors.errors, (e: any) => {
                return {
                  path: e.path,
                  message: e.message,
                  value: e.value,
                };
              }),
            }
          );
        }
        Object.keys(validationErrors.errors).forEach((key) => {
          const { message, value } = validationErrors.errors[key];
          errors.push({
            path: key,
            message,
            value,
          });
        });
        return {
          record: null,
          recordId: null,
          errors,
        };
      } else {
        await doc.save();
        return {
          record: doc,
          recordId: tc.getRecordIdFn()(doc),
          errors: null,
        };
      }
    }) as any,
  });

  return resolver;
}
