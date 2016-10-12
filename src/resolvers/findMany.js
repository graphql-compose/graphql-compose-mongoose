/* @flow */
/* eslint-disable no-param-reassign */

import { GraphQLList } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { skipHelperArgs, skipHelper } from './helpers/skip';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { filterHelperArgs, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';
import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function findMany(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver findMany() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('Second arg for Resolver findMany() should be instance of TypeComposer.');
  }

  return new Resolver({
    outputType: new GraphQLList(typeComposer.getType()),
    name: 'findMany',
    kind: 'query',
    args: {
      ...filterHelperArgs(typeComposer, model, {
        filterTypeName: `FilterFindMany${typeComposer.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortFindMany${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      resolveParams.query = model.find();
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);
      return resolveParams.query.exec();
    },
  });
}
