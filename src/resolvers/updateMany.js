/* @flow */
/* eslint-disable no-param-reassign */
import { recordHelperArgs } from './helpers/record';
import { skipHelperArgs, skipHelper } from './helpers/skip';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { filterHelperArgs, filterHelper } from './helpers/filter';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { GraphQLObjectType, GraphQLInt } from 'graphql';
import toDottedObject from '../utils/toDottedObject';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import { Resolver, TypeComposer } from 'graphql-compose';


export default function updateMany(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver updateMany() should be instance of Mongoose Model.'
    );
  }
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error(
      'Second arg for Resolver updateMany() should be instance of TypeComposer.'
    );
  }

  const resolver = new Resolver(typeComposer, {
    name: 'updateMany',
    kind: 'mutation',
    description: 'Update many documents without returning them: '
               + 'Use Query.update mongoose method. '
               + 'Do not apply mongoose defaults, setters, hooks and validation. ',
    outputType: new GraphQLObjectType({
      name: `UpdateMany${typeComposer.getTypeName()}Payload`,
      fields: {
        numAffected: {
          type: GraphQLInt,
          description: 'Affected documents number',
        },
      },
    }),
    args: {
      ...recordHelperArgs(typeComposer, {
        recordTypeName: `UpdateMany${typeComposer.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        ...(opts && opts.record),
      }),
      ...filterHelperArgs(typeComposer, {
        filterTypeName: `FilterUpdateMany${typeComposer.getTypeName()}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortUpdateMany${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const recordData = resolveParams.args && resolveParams.args.record || {};

      if (!(typeof recordData === 'object')
        || Object.keys(recordData).length === 0
      ) {
        return Promise.reject(
          new Error(`${typeComposer.getTypeName()}.updateMany resolver requires `
                  + 'at least one value in args.record')
        );
      }

      resolveParams.query = model.find();
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      limitHelper(resolveParams);

      resolveParams.query = resolveParams.query.setOptions({ multi: true }); // eslint-disable-line
      resolveParams.query.update({ $set: toDottedObject(recordData) });

      return resolveParams.query
        .exec()
        .then(res => {
          if (res.ok) {
            return {
              numAffected: res.nModified,
            };
          }

          return Promise.reject(res);
        });
    },
  });

  return resolver;
}
