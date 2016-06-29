/* @flow */

import { GraphQLInt, GraphQLInputObjectType, GraphQLNonNull } from 'graphql/type';
import { toDottedObject } from '../../utils';
import type {
  GraphQLFieldConfigArgumentMap,
  ExtendedResolveParams,
  MongooseModelT,
} from '../../definition';

export type filterHelperArgsGenOpts = {
  filterTypeName: string,
  isRequired?: boolean,
};

export const filterHelperArgsGen = (
  model: MongooseModelT,
  opts: filterHelperArgsGenOpts,
): GraphQLFieldConfigArgumentMap => {
  if (!opts.filterTypeName) {
    throw new Error('You should provide `filterTypeName` in options.');
  }

  const filterType = new GraphQLInputObjectType({
    name: opts.filterTypeName,
    fields: {
      age: {
        name: 'age',
        type: GraphQLInt, // TODO just mock, should be changed in future
      },
    },
  });

  return {
    filter: {
      name: 'filter',
      type: opts.isRequired ? new GraphQLNonNull(filterType) : filterType,
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
