/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver, TypeComposer } from 'graphql-compose';
import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgs, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';
import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';


export default function findOne(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver findOne() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('Second arg for Resolver findOne() should be instance of TypeComposer.');
  }

  return new Resolver({
    outputType: typeComposer.getType(),
    name: 'findOne',
    kind: 'query',
    args: {
      ...filterHelperArgs(typeComposer, model, {
        filterTypeName: `FilterFindOne${typeComposer.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...skipHelperArgs(),
      ...sortHelperArgs(model, {
        sortTypeName: `SortFindOne${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams : ExtendedResolveParams) => {
      resolveParams.query = model.findOne({}); // eslint-disable-line
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      projectionHelper(resolveParams);

      return resolveParams.query.exec();
    },
  });
}
