import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  limitHelper,
  limitHelperArgs,
  skipHelper,
  skipHelperArgs,
  filterHelper,
  filterHelperArgs,
  sortHelper,
  sortHelperArgs,
  projectionHelper,
  prepareAliases,
  prepareAliasesReverse,
} from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { beforeQueryHelperLean } from './helpers/beforeQueryHelper';

export default function findManyLean<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findManyLean() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver findManyLean() should be instance of ObjectTypeComposer.'
    );
  }

  const aliases = prepareAliases(model);
  const aliasesReverse = prepareAliasesReverse(model);

  return tc.schemaComposer.createResolver({
    type: tc.NonNull.List.NonNull,
    name: 'findManyLean',
    kind: 'query',
    args: {
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterFindManyLean',
        suffix: 'Input',
        ...opts?.filter,
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...opts?.limit,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindManyLean${tc.getTypeName()}Input`,
        ...opts?.sort,
      }),
    },
    resolve: ((resolveParams: ExtendedResolveParams) => {
      resolveParams.query = model.find();
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);
      skipHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams, aliases);
      return beforeQueryHelperLean(resolveParams, aliasesReverse) || [];
    }) as any,
  });
}
