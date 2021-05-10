import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  limitHelper,
  limitHelperArgs,
  skipHelper,
  skipHelperArgs,
  recordHelperArgs,
  filterHelper,
  filterHelperArgs,
  sortHelper,
  sortHelperArgs,
  prepareNestedAliases,
  RecordHelperArgsOpts,
  FilterHelperArgsOpts,
  SortHelperArgsOpts,
  LimitHelperArgsOpts,
} from './helpers';
import { toMongoDottedObject } from '../utils/toMongoDottedObject';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';
import { addErrorCatcherField } from './helpers/errorCatcher';

export interface UpdateManyResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `record` argument. */
  record?: RecordHelperArgsOpts;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  limit?: LimitHelperArgsOpts | false;
  skip?: false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}

type TArgs = {
  record: any;
  filter?: any;
  limit?: number;
  skip?: number;
  sort?: string | string[] | Record<string, any>;
};

export function updateMany<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: UpdateManyResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateMany() should be instance of Mongoose Model.');
  }
  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver updateMany() should be instance of ObjectTypeComposer.'
    );
  }

  const outputTypeName = `UpdateMany${tc.getTypeName()}${opts?.suffix || ''}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      numAffected: {
        type: 'Int',
        description: 'Affected documents number',
      },
    });
  });

  const aliases = prepareNestedAliases(model.schema);

  const resolver = tc.schemaComposer.createResolver<TSource, TArgs>({
    name: 'updateMany',
    kind: 'mutation',
    description:
      'Update many documents without returning them: ' +
      'Use Query.update mongoose method. ' +
      'Do not apply mongoose defaults, setters, hooks and validation. ',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        prefix: 'UpdateMany',
        suffix: `${opts?.suffix || ''}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        allFieldsNullable: true,
        ...opts?.record,
      }),
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterUpdateMany',
        suffix: `${opts?.suffix || ''}Input`,
        ...opts?.filter,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortUpdateMany${tc.getTypeName()}${opts?.suffix || ''}Input`,
        ...opts?.sort,
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...opts?.limit,
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const recordData = resolveParams?.args?.record;

      if (!(typeof recordData === 'object') || Object.keys(recordData).length === 0) {
        return Promise.reject(
          new Error(
            `${tc.getTypeName()}.updateMany resolver requires at least one value in args.record`
          )
        );
      }

      resolveParams.query = model.find();
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      limitHelper(resolveParams);

      resolveParams.query = resolveParams.query.setOptions({ multi: true });

      if (resolveParams.query.updateMany) {
        resolveParams.query.updateMany({
          $set: toMongoDottedObject(recordData, aliases),
        });
      } else {
        // OLD mongoose
        resolveParams.query.update({
          $set: toMongoDottedObject(recordData, aliases),
        });
      }

      const res = await beforeQueryHelper(resolveParams);

      if (res.ok) {
        return {
          numAffected: res.n || res.nModified,
        };
      }

      // unexpected response
      throw new Error(JSON.stringify(res));
    }) as any,
  });

  if (!opts?.disableErrorField) {
    // Add `error` field to payload which can catch resolver Error
    // and return it in mutation payload
    addErrorCatcherField(resolver);
  }

  return resolver;
}
