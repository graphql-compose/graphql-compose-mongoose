import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  filterHelper,
  filterHelperArgs,
  prepareAliases,
  FilterHelperArgsOpts,
  ArgsMap,
} from './helpers';
import type { ExtendedResolveParams } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';

export interface CountResolverOpts {
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
}

export default function count<TSource = any, TContext = any, TDoc extends Document = any>(
  model: Model<TDoc>,
  tc: ObjectTypeComposer<TDoc, TContext>,
  opts?: CountResolverOpts
): Resolver<TSource, TContext, ArgsMap, TDoc> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver count() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('Second arg for Resolver count() should be instance of ObjectTypeComposer.');
  }

  const aliases = prepareAliases(model);

  return tc.schemaComposer.createResolver({
    type: 'Int',
    name: 'count',
    kind: 'query',
    args: {
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterCount',
        suffix: 'Input',
        ...opts?.filter,
      }),
    },
    resolve: ((resolveParams: ExtendedResolveParams<TDoc>) => {
      resolveParams.query = model.find();
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);
      if (resolveParams.query.countDocuments) {
        // mongoose 5.2.0 and above
        resolveParams.query.countDocuments();
        return beforeQueryHelper(resolveParams);
      } else {
        // mongoose 5 and below
        resolveParams.query.count();
        return beforeQueryHelper(resolveParams);
      }
    }) as any,
  }) as any;
}
