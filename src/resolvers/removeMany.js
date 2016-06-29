/* @flow */
/* eslint-disable no-param-reassign */
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { GraphQLObjectType, GraphQLInt } from 'graphql';

import type {
  MongooseModelT,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

export default function removeMany(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
): Resolver {
  const resolver = new Resolver({
    name: 'removeMany',
    kind: 'mutation',
    description: 'Remove many documents without returning them: '
               + 'Use Query.remove mongoose method. '
               + 'Do not apply mongoose defaults, setters, hooks and validation. ',
    outputType: new GraphQLObjectType({
      name: `RemoveMany${gqType.name}Payload`,
      fields: {
        numAffected: {
          type: GraphQLInt,
          description: 'Affected documents number',
        },
      },
    }),
    args: {
      ...filterHelperArgsGen(model, {
        filterTypeName: `Filter${gqType.name}Input`,
        isRequired: true,
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const filterData = resolveParams.args && resolveParams.args.filter || {};

      if (!(typeof filterData === 'object')
        || Object.keys(filterData).length === 0
      ) {
        return Promise.reject(
          new Error(`${gqType.name}.removeMany resolver requires at least one value in args.filter`)
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
