/* @flow */

import { GraphQLInt, GraphQLInputObjectType } from 'graphql/type';
import { toDottedObject } from '../../utils';
import type {
  GraphQLFieldConfigArgumentMap,
  ExtendedResolveParams,
} from '../../definition';

export const filterHelperArgsGen = (): GraphQLFieldConfigArgumentMap => {
  return {
    filter: {
      name: 'filter',
      type: new GraphQLInputObjectType({
        name: 'InputFilterSomeName',
        fields: {
          age: {
            name: 'age',
            type: GraphQLInt, // TODO just mock, should be changed in future
          },
        },
      }),
      description: 'Filter by indexed fields',
    },
  };
};

export function filterHelper(resolveParams: ExtendedResolveParams): void {
  const filter = resolveParams.args && resolveParams.args.filter;
  if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
    resolveParams.query = resolveParams.query.where(toDottedObject(filter)); // eslint-disable-line
  }
}
