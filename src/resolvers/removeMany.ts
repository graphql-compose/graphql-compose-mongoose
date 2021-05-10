import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  filterHelperArgs,
  filterHelper,
  prepareNestedAliases,
  FilterHelperArgsOpts,
  limitHelperArgs,
  LimitHelperArgsOpts,
} from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';
import { addErrorCatcherField } from './helpers/errorCatcher';

export interface RemoveManyResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  limit?: LimitHelperArgsOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}

type TArgs = {
  filter: any;
};

export function removeMany<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: RemoveManyResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeMany() should be instance of Mongoose Model.');
  }

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      'Second arg for Resolver removeMany() should be instance of ObjectTypeComposer.'
    );
  }

  const outputTypeName = `RemoveMany${tc.getTypeName()}${opts?.suffix || ''}Payload`;
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
    name: 'removeMany',
    kind: 'mutation',
    description:
      'Remove many documents without returning them: ' +
      'Use Query.remove mongoose method. ' +
      'Do not apply mongoose defaults, setters, hooks and validation. ',
    type: outputType,
    args: {
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterRemoveMany',
        suffix: `${opts?.suffix || ''}Input`,
        isRequired: true,
        ...opts?.filter,
      }),
      ...limitHelperArgs({
        ...opts?.limit,
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      const filterData = resolveParams?.args?.filter;

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        throw new Error(
          `${tc.getTypeName()}.removeMany resolver requires at least one value in args.filter`
        );
      }

      resolveParams.query = model.find();
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);

      if (resolveParams.query.deleteMany) {
        resolveParams.query = resolveParams.query.deleteMany();
      } else {
        // old mongoose
        resolveParams.query = resolveParams.query.remove();
      }

      const res = await beforeQueryHelper(resolveParams);

      if (res.ok) {
        // mongoose 5
        return {
          numAffected: res.n,
        };
      } else if (res.result && res.result.ok) {
        // mongoose 4
        return {
          numAffected: res.result.n,
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
