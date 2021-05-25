import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  filterHelperArgs,
  sortHelperArgs,
  SortHelperArgsOpts,
  FilterHelperArgsOpts,
} from './helpers';
import { findOne } from './findOne';
import type { ExtendedResolveParams } from './index';
import { addErrorCatcherField } from './helpers/errorCatcher';
import { payloadRecordId, PayloadRecordIdHelperOpts } from './helpers/payloadRecordId';

export interface RemoveOneResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}

type TArgs = {
  filter?: any;
  sort?: string | string[] | Record<string, any>;
};

export function removeOne<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: RemoveOneResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeOne() should be instance of Mongoose Model.');
  }

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver removeOne() should be instance of ObjectTypeComposer.'
    );
  }

  const findOneResolver = findOne(model, tc, opts);

  const outputTypeName = `RemoveOne${tc.getTypeName()}${opts?.suffix || ''}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.setFields({
      ...payloadRecordId(tc, opts?.recordId),
      record: {
        type: tc.getTypeName(),
        description: 'Removed document',
      },
    });
  });

  const resolver = tc.schemaComposer.createResolver<TSource, TArgs>({
    name: 'removeOne',
    kind: 'mutation',
    description:
      'Remove one document: ' +
      '1) Remove with hooks via findOneAndRemove. ' +
      '2) Return removed document.',
    type: outputType,
    args: {
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterRemoveOne',
        suffix: `${opts?.suffix || ''}Input`,
        ...opts?.filter,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortRemoveOne${tc.getTypeName()}${opts?.suffix || ''}Input`,
        ...opts?.sort,
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const filterData = resolveParams?.args?.filter;

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        return Promise.reject(
          new Error(
            `${tc.getTypeName()}.removeOne resolver requires at least one value in args.filter`
          )
        );
      }

      // We should get all data for document, cause Mongoose model may have hooks/middlewares
      // which required some fields which not in graphql projection
      // So empty projection returns all fields.
      resolveParams.projection = {};

      let doc: TDoc = await findOneResolver.resolve(resolveParams);

      if (resolveParams.beforeRecordMutate) {
        doc = await resolveParams.beforeRecordMutate(doc, resolveParams);
      }

      if (doc) {
        await doc.remove();

        return {
          record: doc,
        };
      }

      return null;
    }) as any,
  });

  if (!opts?.disableErrorField) {
    // Add `error` field to payload which can catch resolver Error
    // and return it in mutation payload
    addErrorCatcherField(resolver);
  }

  return resolver;
}
