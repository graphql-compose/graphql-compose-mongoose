/* @flow */
/* eslint-disable no-param-reassign */
import { filterHelperArgs, filterHelper } from './helpers/filter';
import { GraphQLObjectType, GraphQLInt } from 'graphql';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import { Resolver, TypeComposer } from 'graphql-compose';


export default function removeMany(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts,
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver removeMany() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error(
      'Second arg for Resolver removeMany() should be instance of TypeComposer.'
    );
  }

  const resolver = new Resolver(typeComposer, {
    name: 'removeMany',
    kind: 'mutation',
    description: 'Remove many documents without returning them: '
               + 'Use Query.remove mongoose method. '
               + 'Do not apply mongoose defaults, setters, hooks and validation. ',
    outputType: new GraphQLObjectType({
      name: `RemoveMany${typeComposer.getTypeName()}Payload`,
      fields: {
        numAffected: {
          type: GraphQLInt,
          description: 'Affected documents number',
        },
      },
    }),
    args: {
      ...filterHelperArgs(typeComposer, {
        filterTypeName: `FilterRemoveMany${typeComposer.getTypeName()}Input`,
        isRequired: true,
        model,
        ...(opts && opts.filter),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const filterData = resolveParams.args && resolveParams.args.filter || {};

      if (!(typeof filterData === 'object')
        || Object.keys(filterData).length === 0
      ) {
        return Promise.reject(
          new Error(`${typeComposer.getTypeName()}.removeMany resolver requires `
                  + 'at least one value in args.filter')
        );
      }

      resolveParams.query = model.find();
      filterHelper(resolveParams);
      resolveParams.query = resolveParams.query.remove();

      return resolveParams.query
        .exec()
        .then(res => {
          if (res.result && res.result.ok) {
            return {
              numAffected: res.result.n,
            };
          }

          return Promise.reject(res);
        });
    },
  });

  return resolver;
}
