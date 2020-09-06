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
} from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';

export default function findOne<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findOne() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('Second arg for Resolver findOne() should be instance of ObjectTypeComposer.');
  }

  const aliases = prepareAliases(model);

  return tc.schemaComposer.createResolver({
    type: tc,
    name: 'findOne',
    kind: 'query',
    args: {
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterFindOne',
        suffix: 'Input',
        ...opts?.filter,
      }),
      ...skipHelperArgs(),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortFindOne${tc.getTypeName()}Input`,
        ...opts?.sort,
      }),
    },
    resolve: ((resolveParams: ExtendedResolveParams) => {
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
