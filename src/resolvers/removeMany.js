/* @flow */
/* eslint-disable no-param-reassign */

import { GraphQLObjectType, GraphQLInt } from 'graphql';
import { Resolver, TypeComposer } from 'graphql-compose';
import { filterHelperArgs, filterHelper } from './helpers/filter';
import typeStorage from '../typeStorage';

import type { MongooseModelT, ExtendedResolveParams, genResolverOpts } from '../definition';

export default function removeMany(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeMany() should be instance of Mongoose Model.');
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('Second arg for Resolver removeMany() should be instance of TypeComposer.');
  }

  const outputTypeName = `RemoveMany${typeComposer.getTypeName()}Payload`;
  const outputType = typeStorage.getOrSet(
    outputTypeName,
    new GraphQLObjectType({
      name: outputTypeName,
      fields: {
        numAffected: {
          type: GraphQLInt,
          description: 'Affected documents number',
        },
      },
    })
  );

  const resolver = new Resolver({
    name: 'removeMany',
    kind: 'mutation',
    description:
      'Remove many documents without returning them: ' +
        'Use Query.remove mongoose method. ' +
        'Do not apply mongoose defaults, setters, hooks and validation. ',
    type: outputType,
    args: {
      ...filterHelperArgs(typeComposer, model, {
        filterTypeName: `FilterRemoveMany${typeComposer.getTypeName()}Input`,
        isRequired: true,
        model,
        ...(opts && opts.filter),
      }),
    },
    // $FlowFixMe
    resolve: (resolveParams: ExtendedResolveParams) => {
      const filterData = (resolveParams.args && resolveParams.args.filter) || {};

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        return Promise.reject(
          new Error(
            `${typeComposer.getTypeName()}.removeMany resolver requires ` +
              'at least one value in args.filter'
          )
        );
      }

      resolveParams.query = model.find();
      // $FlowFixMe
      filterHelper(resolveParams);
      resolveParams.query = resolveParams.query.remove();

      return (
        // `beforeQuery` is experemental feature, if you want to use it
        // please open an issue with your use case, cause I suppose that
        // this option is excessive
        // $FlowFixMe
        (resolveParams.beforeQuery
          ? Promise.resolve(resolveParams.beforeQuery(resolveParams.query, resolveParams))
          : resolveParams.query.exec()).then(res => {
          if (res.result && res.result.ok) {
            return {
              numAffected: res.result.n,
            };
          }

          return Promise.reject(res);
        })
      );
    },
  });

  return resolver;
}
