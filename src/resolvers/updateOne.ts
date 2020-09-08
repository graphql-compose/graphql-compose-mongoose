import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import type { ExtendedResolveParams } from './index';
import {
  skipHelperArgs,
  recordHelperArgs,
  filterHelperArgs,
  sortHelperArgs,
  FilterHelperArgsOpts,
  RecordHelperArgsOpts,
  SortHelperArgsOpts,
} from './helpers';
import findOne from './findOne';
import { addErrorCatcherField } from './helpers/errorCatcher';
import { validateAndThrow } from './helpers/validate';

export interface UpdateOneResolverOpts {
  record?: RecordHelperArgsOpts | false;
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  skip?: false;
}

export default function updateOne<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: UpdateOneResolverOpts
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
      const recordData = resolveParams?.args?.record;
      const filterData = resolveParams?.args?.filter;

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        return Promise.reject(
          new Error(
            `${tc.getTypeName()}.updateOne resolver requires at least one value in args.filter`
          )
        );
      }

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      let doc: Document = await findOneResolver.resolve({ ...resolveParams, projection: {} });

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }

      if (!doc) return null;

      if (recordData) {
        doc.set(recordData);
        await validateAndThrow(doc);
        await doc.save({ validateBeforeSave: false });
      }

      return {
        record: doc,
        recordId: tc.getRecordIdFn()(doc as any),
      };
    }) as any,
  });

  // Add `error` field to payload which can catch resolver Error
  // and return it in mutation payload
  addErrorCatcherField(resolver);

  return resolver;
}
