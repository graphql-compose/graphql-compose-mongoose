/* @flow */
/* eslint-disable no-param-reassign */
import { inputHelperArgs } from './helpers/input';
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
import Resolver from 'graphql-compose/lib/resolver/resolver';


export default function updateMany(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts,
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver updateMany() should be instance of Mongoose Model.'
    );
  }
  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error(
      'Second arg for Resolver updateMany() should be instance of GraphQLObjectType.'
    );
  }

  const resolver = new Resolver({
    name: 'updateMany',
    kind: 'mutation',
    description: 'Update many documents without returning them: '
               + 'Use Query.update mongoose method. '
               + 'Do not apply mongoose defaults, setters, hooks and validation. ',
    outputType: new GraphQLObjectType({
      name: `UpdateMany${gqType.name}Payload`,
      fields: {
        numAffected: {
          type: GraphQLInt,
          description: 'Affected documents number',
        },
      },
    }),
    args: {
      ...inputHelperArgs(gqType, {
        inputTypeName: `UpdateMany${gqType.name}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        ...(opts && opts.input),
      }),
      ...filterHelperArgs(gqType, {
        filterTypeName: `FilterUpdateMany${gqType.name}Input`,
        model,
        ...(opts && opts.filter),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortUpdateMany${gqType.name}Input`,
        ...(opts && opts.sort),
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const inputData = resolveParams.args && resolveParams.args.input || {};

      if (!(typeof inputData === 'object')
        || Object.keys(inputData).length === 0
      ) {
        return Promise.reject(
          new Error(`${gqType.name}.updateMany resolver requires at least one value in args.input`)
        );
      }

      resolveParams.query = model.find();
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      limitHelper(resolveParams);

      resolveParams.query = resolveParams.query.setOptions({ multi: true }); // eslint-disable-line
      resolveParams.query.update({ $set: toDottedObject(inputData) });

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
