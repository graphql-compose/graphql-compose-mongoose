/* @flow */
/* eslint-disable no-param-reassign */
import { inputHelperArgsGen } from './helpers/input';
import { GraphQLObjectType } from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import type {
  MongooseModelT,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

export default function createOne(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
): Resolver {
  const resolver = new Resolver({
    name: 'createOne',
    kind: 'mutation',
    description: 'Create one document with mongoose defaults, setters, hooks and validation',
    outputType: new GraphQLObjectType({
      name: `CreateOne${gqType.name}Payload`,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Created document ID',
        },
        record: {
          type: gqType,
          description: 'Created document',
        },
      },
    }),
    args: {
      ...inputHelperArgsGen(gqType, {
        inputTypeName: `CreateOne${gqType.name}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const inputData = resolveParams.args && resolveParams.args.input || {};

      if (!(typeof inputData === 'object')
        || Object.keys(inputData).length === 0
      ) {
        return Promise.reject(
          new Error(`${gqType.name}.createOne resolver requires at least one value in args.input`)
        );
      }

      return model.create(inputData)
        .then(record => {
          if (record) {
            return {
              record: record.toObject(),
              recordId: record.id,
            };
          }

          return null;
        });
    },
  });

  return resolver;
}
