import { GraphQLInt, GraphQLInputObjectType } from 'graphql/type';
import { toDottedObject } from '../../utils';

export const filterHelperArgsGen = () => {
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

export function filterHelper(query, args = {}) {
  if (args.filter && Object.keys(args.filter).length > 0) {
    query = query.where(toDottedObject(args.filter)); // eslint-disable-line no-param-reassign
  }

  return query;
}
