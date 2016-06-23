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

export function filterHelper(resolveParams) {
  const filter = resolveParams.args && resolveParams.args.filter;
  if (filter && Object.keys(filter).length > 0) {
    resolveParams.cursor = resolveParams.cursor.where(toDottedObject(filter)); // eslint-disable-line
  }
}
