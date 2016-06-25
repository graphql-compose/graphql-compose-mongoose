/* @flow */
/* eslint-disable no-param-reassign */

import { skipHelperArgs } from './helpers/skip';
import { inputHelperArgsGen } from './helpers/input';
import { filterHelperArgsGen } from './helpers/filter';
import { sortHelperArgsGen } from './helpers/sort';
import findOne from './findOne';

import type {
  MongooseModelT,
  GraphQLObjectType,
  ExtendedResolveParams,
} from '../definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

export default function updateOne(
  model: MongooseModelT,
  gqType: GraphQLObjectType,
): Resolver {
  const findOneResolver = findOne(model, gqType);

  return new Resolver({
    outputType: 'someCrazy',
    name: 'updateOne',
    kind: 'mutation',
    description: 'Find one document. Retrieve mongoose model document. Apply updates to document. '
               + 'Apply defaults, setters, hooks and validation. And save it.',
    args: {
      ...inputHelperArgsGen(gqType, {
        inputTypeName: `UpdateOne${gqType.name}Input`,
        removeFields: ['id', '_id'],
      }),
      ...filterHelperArgsGen(),
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
}
