import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  skipHelper,
  skipHelperArgs,
  filterHelper,
  filterHelperArgs,
  sortHelper,
  sortHelperArgs,
  projectionHelper,
  prepareAliases,
  prepareAliasesReverse,
  replaceAliases,
  SortHelperArgsOpts,
  FilterHelperArgsOpts,
} from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelperLean } from './helpers/beforeQueryHelper';

export interface FindOneLeanResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  skip?: false;
}

type TArgs = {
  filter?: any;
  sort?: Record<string, any>;
  skip?: number;
};

export function findOneLean<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: FindOneLeanResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findOneLean() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver findOneLean() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareAliases(model);
  const aliasesReverse = prepareAliasesReverse(model);

  return tc.schemaComposer.createResolver<TSource, TArgs>({
    type: tc,
    name: 'findOne',
    kind: 'query',
    args: {
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterFindOneLean',
        suffix: `${opts?.suffix || ''}Input`,
        ...opts?.filter,
      }),
      ...skipHelperArgs(),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindOneLean${tc.getTypeName()}${opts?.suffix || ''}Input`,
        ...opts?.sort,
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      resolveParams.query = model.findOne({});
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams, aliases);
      const result = await beforeQueryHelperLean(resolveParams);
      return result && aliasesReverse ? replaceAliases(result, aliasesReverse) : result;
    }) as any,
  });
}
