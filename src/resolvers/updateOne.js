/* @flow */
/* eslint-disable no-param-reassign */
import { skipHelperArgs } from './helpers/skip';
import { inputHelperArgsGen } from './helpers/input';
import { filterHelperArgsGen } from './helpers/filter';
import { sortHelperArgsGen } from './helpers/sort';
import findOne from './findOne';
import { GraphQLObjectType } from 'graphql';
import GraphQLMongoID from '../types/mongoid';

import type {
  MongooseModelT,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

export default function updateOne(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
): Resolver {
  const findOneResolver = findOne(model, gqType);

  const resolver = new Resolver({
    name: 'updateOne',
    kind: 'mutation',
    description: 'Update one document: '
               + '1) Retrieve one document via findOne. '
               + '2) Apply updates to mongoose document. '
               + '3) Mongoose applies defaults, setters, hooks and validation. '
               + '4) And save it.',
    outputType: new GraphQLObjectType({
      name: `UpdateOne${gqType.name}Payload`,
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
        inputTypeName: `UpdateOne${gqType.name}Input`,
        removeFields: ['id', '_id'],
      }),
      ...filterHelperArgsGen(model, {
        filterTypeName: `Filter${gqType.name}Input`,
      }),
      ...sortHelperArgsGen(model, {
        sortTypeName: `Sort${gqType.name}Input`,
      }),
      ...skipHelperArgs,
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const inputData = resolveParams.args && resolveParams.args.input || null;
      const filterData = resolveParams.args && resolveParams.args.filter || {};

      if (!(typeof filterData === 'object')
        || Object.keys(filterData).length === 0
      ) {
        return Promise.reject(
          new Error(`${gqType.name}.findOne resolver requires at least one value in args.filter`)
        );
      }

      return findOneResolver.resolve(resolveParams)
        // save changes to DB
        .then(doc => {
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
