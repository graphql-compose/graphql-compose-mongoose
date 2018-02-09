/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { filterHelper, filterHelperArgs } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function count(
  model: MongooseModel,
  typeComposer: TypeComposer,
  opts?: GenResolverOpts
): Resolver<*, *> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver count() should be instance of Mongoose Model.');
  }

  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver count() should be instance of TypeComposer.');
  }

  return new Resolver({
    type: 'Int',
    name: 'count',
    kind: 'query',
    args: {
      ...filterHelperArgs(typeComposer, model, {
        filterTypeName: `Filter${typeComposer.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      resolveParams.query = model.find();
      filterHelper(resolveParams);
      return resolveParams.query.count().exec();
    },
  });
}
