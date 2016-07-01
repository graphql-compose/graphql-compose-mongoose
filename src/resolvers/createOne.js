/* @flow */
/* eslint-disable no-param-reassign */
import { inputHelperArgs } from './helpers/input';
import { GraphQLObjectType } from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import type {
  MongooseModelT,
  ExtendedResolveParams,
  genResolverOpts,
} from '../definition';
import Resolver from 'graphql-compose/lib/resolver/resolver';


export default function createOne(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
  opts?: genResolverOpts,
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver createOne() should be instance of Mongoose Model.'
    );
  }

  if (!(gqType instanceof GraphQLObjectType)) {
    throw new Error('Second arg for Resolver createOne() should be instance of GraphQLObjectType.');
  }

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
      ...inputHelperArgs(gqType, {
        inputTypeName: `CreateOne${gqType.name}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        ...(opts && opts.input),
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
