/* eslint-disable no-param-reassign */

import type {
  MongooseModelT,
  GraphQLObjectType,
} from './definition';
import Resolver from '../../../graphql-compose/src/resolver/resolver';

import { skipHelperArgs, skipHelper } from './helpers/skip';
import { filterHelperArgsGen, filterHelper } from './helpers/filter';
import { sortHelperArgsGen, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';
import findOne from './findOne';

export default function updateOne(model: MongooseModelT, gqType: GraphQLObjectType): Resolver {
  const findOneResolver = findOne(model);

  return new Resolver({
    outputType: 'someCrazy',
    name: 'updateOne',
    kind: 'mutation',
    description: 'Find one document. Retrieve mongoose model document. Apply updates to document. '
               + 'Apply defaults, setters, hooks and validation. And save it.',
    args: {
      ...inputHelperArgsGen(model, gqType),
      ...filterHelperArgsGen(),
      ...sortHelperArgsGen(model, 'prefix'),
      ...skipHelperArgs,
    },
    resolve: (resolveParams = {}) => {
      const inputData = resolveParams.args && resolveParams.args.input || null;

      return findOneResolver.resolve(resolveParams)
        // save changes to DB
        .then(doc => {
          if (inputData) {
            doc.set(inputData);
            return doc.save().then(res => {
              if (res.ok) {
                return doc;
              }
              return null;
            });
          }
          return doc;
        })
        // prepare output payload
        .then(record => {
          if (record) {
            return {
              record: record.toObject(),
              recordId: record._id,
            };
          }

          return null;
        });
    },
  });
}
