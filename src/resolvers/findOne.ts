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
  FilterHelperArgsOpts,
  SortHelperArgsOpts,
} from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';

export interface FindOneResolverOpts {
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

export function findOne<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: FindOneResolverOpts
): Resolver<TSource, TContext, TArgs, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findOne() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('Second arg for Resolver findOne() should be instance of ObjectTypeComposer.');
  }

  const aliases = prepareAliases(model);

  return tc.schemaComposer.createResolver<TSource, TArgs>({
    type: tc,
    name: 'findOne',
    kind: 'query',
    args: {
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterFindOne',
        suffix: `${opts?.suffix || ''}Input`,
        ...opts?.filter,
      }),
      ...skipHelperArgs(),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindOne${tc.getTypeName()}${opts?.suffix || ''}Input`,
        ...opts?.sort,
      }),
    },
    resolve: ((resolveParams: ExtendedResolveParams<TDoc>) => {
      resolveParams.query = model.findOne({});
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams, aliases);
      return beforeQueryHelper(resolveParams);
    }) as any,
  });
}
