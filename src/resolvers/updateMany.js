/* @flow */
/* eslint-disable no-param-reassign */
import { inputHelperArgsGen } from './helpers/input';
import { skipHelperArgs, skipHelper } from './helpers/skip';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgsGen, sortHelper } from './helpers/sort';
import { GraphQLObjectType, GraphQLInt } from 'graphql';
import toDottedObject from '../utils/toDottedObject';

import type {
  MongooseModelT,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

export default function updateMany(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
): Resolver {
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
      ...inputHelperArgsGen(gqType, {
        inputTypeName: `UpdateMany${gqType.name}Input`,
        removeFields: ['id', '_id'],
      }),
      ...filterHelperArgsGen(),
      ...sortHelperArgsGen(model, {
        sortTypeName: `Sort${gqType.name}Input`,
      }),
      ...skipHelperArgs,
      ...limitHelperArgs,
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

      resolveParams.query = model.where({}); // eslint-disable-line
      filterHelper(resolveParams);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      limitHelper(resolveParams);

      resolveParams.query = resolveParams.query.setOptions({ multi: true }); // eslint-disable-line
      resolveParams.query.update({ $set: inputData });

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
