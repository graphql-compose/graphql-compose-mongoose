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
import { findOne } from './findOne';
import { addErrorCatcherField } from './helpers/errorCatcher';
import { validateAndThrow } from './helpers/validate';
import { PayloadRecordIdHelperOpts, payloadRecordId } from './helpers/payloadRecordId';

export interface UpdateOneResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `record` argument. */
  record?: RecordHelperArgsOpts;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  skip?: false;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}

type TArgs = {
  record: any;
  filter?: any;
  skip?: number;
  sort?: string | string[] | Record<string, any>;
};

export function updateOne<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: UpdateOneResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateOne() should be instance of Mongoose Model.');
  }
  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver updateOne() should be instance of ObjectTypeComposer.'
    );
  }

  const findOneResolver = findOne(model, tc, opts);

  const outputTypeName = `UpdateOne${tc.getTypeName()}${opts?.suffix || ''}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.setFields({
      ...payloadRecordId(tc, opts?.recordId),
      record: {
        type: tc.getTypeName(),
        description: 'Updated document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver<TSource, TArgs>({
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
        suffix: `${opts?.suffix || ''}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        allFieldsNullable: true,
        ...opts?.record,
      }),
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterUpdateOne',
        suffix: `${opts?.suffix || ''}Input`,
        ...opts?.filter,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortUpdateOne${tc.getTypeName()}${opts?.suffix || ''}Input`,
        ...opts?.sort,
      }),
      ...skipHelperArgs(),
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
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
      let doc: TDoc = await findOneResolver.resolve({ ...resolveParams, projection: {} });

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }

      if (!doc) return null;

      doc.set(recordData);
      await validateAndThrow(doc);
      await doc.save({ validateBeforeSave: false });

      return {
        record: doc,
      };
    }) as any,
  });

  if (!opts?.disableErrorField) {
    // Add `error` field to payload which can catch resolver Error
    // and return it in mutation payload
    addErrorCatcherField(resolver);
  }

  return resolver;
}
