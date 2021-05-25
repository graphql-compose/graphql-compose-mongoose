import { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  skipHelper,
  skipHelperArgs,
  filterHelper,
  filterHelperArgs,
  sortHelper,
  sortHelperArgs,
  projectionHelper,
  prepareNestedAliases,
  prepareAliasesReverse,
  replaceAliases,
  FilterHelperArgsOpts,
  SortHelperArgsOpts,
} from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper, beforeQueryHelperLean } from './helpers/beforeQueryHelper';

export interface FindOneResolverOpts {
  /**
   * Enabling the lean option tells Mongoose to skip instantiating
   * a full Mongoose document and just give you the plain JavaScript objects.
   * Documents are much heavier than vanilla JavaScript objects,
   * because they have a lot of internal state for change tracking.
   * The downside of enabling lean is that lean docs don't have:
   *   Default values
   *   Getters and setters
   *   Virtuals
   * Read more about `lean`: https://mongoosejs.com/docs/tutorials/lean.html
   */
  lean?: boolean;
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  skip?: false;
}

type TArgs = {
  filter?: any;
  sort?: string | string[] | Record<string, any>;
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

  if (!tc || !(tc instanceof ObjectTypeComposer)) {
    throw new Error('Second arg for Resolver findOne() should be instance of ObjectTypeComposer.');
  }

  const aliases = prepareNestedAliases(model.schema);
  const aliasesReverse = prepareAliasesReverse(model.schema);

  return tc.schemaComposer.createResolver<TSource, TArgs>({
    type: tc.getTypeName(),
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
    resolve: (async (resolveParams: ExtendedResolveParams<TDoc>) => {
      resolveParams.query = model.findOne({});
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams, aliases);

      if (opts?.lean) {
        const result = await beforeQueryHelperLean(resolveParams);
        return result && aliasesReverse ? replaceAliases(result, aliasesReverse) : result;
      } else {
        return beforeQueryHelper(resolveParams);
      }
    }) as any,
  });
}
