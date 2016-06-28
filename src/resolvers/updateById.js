/* @flow */
/* eslint-disable no-param-reassign */

import { inputHelperArgsGen } from './helpers/input';
import findById from './findById';
import { GraphQLObjectType } from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import type {
  MongooseModelT,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

export default function updateById(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
): Resolver {
  const findByIdResolver = findById(model, gqType);

  const resolver = new Resolver({
    name: 'updateById',
    kind: 'mutation',
    description: 'Update one document: '
               + '1) Retrieve one document by findById. '
               + '2) Apply updates to mongoose document. '
               + '3) Mongoose applies defaults, setters, hooks and validation. '
               + '4) And save it.',
    outputType: new GraphQLObjectType({
      name: `UpdateById${gqType.name}Payload`,
      fields: {
        recordId: {
          type: GraphQLMongoID,
          description: 'Updated document ID',
        },
        record: {
          type: gqType,
          description: 'Updated document',
        },
      },
    }),
    args: {
      ...inputHelperArgsGen(gqType, {
        inputTypeName: `UpdateById${gqType.name}Input`,
        requiredFields: ['_id'],
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const inputData = resolveParams.args && resolveParams.args.input || {};

      if (!(typeof inputData === 'object')) {
        return Promise.reject(
          new Error(`${gqType.name}.updateById resolver requires args.input value`)
        );
      }

      if (!inputData._id) {
        return Promise.reject(
          new Error(`${gqType.name}.updateById resolver requires args.input._id value`)
        );
      }

      resolveParams.args._id = inputData._id;
      delete inputData._id;

      return findByIdResolver.resolve(resolveParams)
        // save changes to DB
        .then(doc => {
          if (!doc) {
            return Promise.reject('Document not found');
          }
          if (inputData) {
            doc.set(inputData);
            return doc.save();
          }
          return doc;
        })
        // prepare output payload
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
