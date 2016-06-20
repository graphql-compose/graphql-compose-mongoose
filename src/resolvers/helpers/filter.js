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
            type: GraphQLInt, // TODO just mock, should be shanged in future
          },
        },
      }),
      description: 'Filter by indexed fields',
    },
  };
};

export function filterHelper(query, { filter }) {
  if (filter && Object.keys(filter).length > 0) {
    query = query.where(toDottedObject(filter)); // eslint-disable-line no-param-reassign
  }

  return query;
}
