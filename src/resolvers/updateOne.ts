import { Resolver, ObjectTypeComposer, mapEachKey } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { getOrCreateErrorInterface } from '../utils/getOrCreateErrorInterface';
import { skipHelperArgs, recordHelperArgs, filterHelperArgs, sortHelperArgs } from './helpers';
import findOne from './findOne';
import { GraphQLError } from 'graphql';

export default function updateOne<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateOne() should be instance of Mongoose Model.');
  }
  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver updateOne() should be instance of ObjectTypeComposer.'
    );
  }

  const findOneResolver = findOne(model, tc, opts);

  getOrCreateErrorInterface(tc);

  const outputTypeName = `UpdateOne${tc.getTypeName()}Payload`;
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
      errors: {
        type: '[ErrorInterface]',
        description: 'Errors that may occur',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver({
    name: 'updateOne',
    kind: 'mutation',
    description:
      'Update one document: ' +
      '1) Retrieve one document via findOne. ' +
      '2) Apply updates to mongoose document. ' +
      '3) Mongoose applies defaults, setters, hooks and validation. ' +
      '4) And save it.',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        prefix: 'UpdateOne',
        suffix: 'Input',
        removeFields: ['id', '_id'],
        isRequired: true,
        allFieldsNullable: true,
        ...opts?.record,
      }),
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterUpdateOne',
        suffix: 'Input',
        ...opts?.filter,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortUpdateOne${tc.getTypeName()}Input`,
        ...opts?.sort,
      }),
      ...skipHelperArgs(),
    },
    resolve: (async (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || null;
      const filterData = (resolveParams.args && resolveParams.args.filter) || {};

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        return Promise.reject(
          new Error(
            `${tc.getTypeName()}.updateOne resolver requires at least one value in args.filter`
          )
        );
      }

      // this feels weird
      const requestsErrors: any = resolveParams?.projection?.errors;
      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      resolveParams.projection = {};

      let doc = await findOneResolver.resolve(resolveParams);

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
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
          if (!requestsErrors) {
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
      }

      if (doc) {
        return {
          record: doc,
          recordId: tc.getRecordIdFn()(doc),
          errors: null,
        };
      }

      return null;
    }) as any,
  });

  return resolver;
}
