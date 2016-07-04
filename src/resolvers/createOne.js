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
import { Resolver, TypeComposer } from 'graphql-compose';


export default function createOne(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: genResolverOpts,
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error(
      'First arg for Resolver createOne() should be instance of Mongoose Model.'
    );
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('Second arg for Resolver createOne() should be instance of TypeComposer.');
  }

  const resolver = new Resolver(typeComposer, {
    name: 'createOne',
    kind: 'mutation',
    description: 'Create one document with mongoose defaults, setters, hooks and validation',
    outputType: new GraphQLObjectType({
      name: `CreateOne${typeComposer.getTypeName()}Payload`,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Created document ID',
        },
        record: {
          type: typeComposer.getType(),
          description: 'Created document',
        },
      },
    }),
    args: {
      ...inputHelperArgs(typeComposer, {
        inputTypeName: `CreateOne${typeComposer.getTypeName()}Input`,
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
          new Error(`${typeComposer.getTypeName()}.createOne resolver requires `
                    + 'at least one value in args.input')
        );
      }

      return model.create(inputData)
        .then(record => {
          if (record) {
            return {
              record: record.toObject(),
              recordId: typeComposer.getRecordIdFn()(record),
            };
          }

          return null;
        });
    },
  });

  return resolver;
}
