import { Resolver, ObjectTypeComposer, mapEachKey } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { recordHelperArgs } from './helpers/record';
import findById from './findById';
import { GraphQLError } from 'graphql';
import { addErrorCatcherField } from './helpers/addErrorCatcherField';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function updateById<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateById() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver updateById() should be instance of ObjectTypeComposer.'
    );
  }

  const findByIdResolver = findById(model, tc);

  const outputTypeName = `UpdateById${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      recordId: {
        type: 'MongoID',
        description: 'Updated document ID',
      },
      record: {
        type: tc,
        description: 'Updated document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver({
    name: 'updateById',
    kind: 'mutation',
    description:
      'Update one document: ' +
      '1) Retrieve one document by findById. ' +
      '2) Apply updates to mongoose document. ' +
      '3) Mongoose applies defaults, setters, hooks and validation. ' +
      '4) And save it.',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        prefix: 'UpdateById',
        suffix: 'Input',
        requiredFields: ['_id'],
        isRequired: true,
        allFieldsNullable: true,
        ...(opts && opts.record),
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams) => {
      const recordData = resolveParams?.args?.record;

      if (!(typeof recordData === 'object')) {
        return Promise.reject(
          new Error(`${tc.getTypeName()}.updateById resolver requires args.record value`)
        );
      }

      if (!recordData._id) {
        return Promise.reject(
          new Error(`${tc.getTypeName()}.updateById resolver requires args.record._id value`)
        );
      }

      resolveParams.args._id = recordData._id;
      delete recordData._id;

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      let doc = await findByIdResolver.resolve({ ...resolveParams, projection: {} });

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }

      if (!doc) {
        throw new Error('Document not found');
      }

      if (recordData) {
        doc.set(recordData);

        const validationErrors: any = await new Promise(function (resolve) {
          doc.validate(null, null, resolve);
        });
        const errors: {
          path: string;
          message: string;
          value: any;
        }[] = [];

        if (validationErrors && validationErrors.errors) {
          if (!resolveParams?.projection?.error) {
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
            error: errors[0], // TODO: refactor: wrap all validation errors inside on Error object
          };
        } else {
          await doc.save();
          return {
            record: doc,
            recordId: tc.getRecordIdFn()(doc),
          };
        }
      }

      return null;
    }) as any,
  });

  addErrorCatcherField(resolver);

  return resolver;
}
