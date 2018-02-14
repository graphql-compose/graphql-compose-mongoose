/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, TypeComposer } from 'graphql-compose';
import type { MongooseModel } from 'mongoose';
import { filterHelperArgs, filterHelper } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';

export default function removeMany(
  model: MongooseModel,
  tc: TypeComposer,
  opts?: GenResolverOpts
): Resolver {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeMany() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'TypeComposer') {
    throw new Error('Second arg for Resolver removeMany() should be instance of TypeComposer.');
  }

  const outputTypeName = `RemoveMany${tc.getTypeName()}Payload`;
  const outputType = tc.constructor.schemaComposer.getOrCreateTC(outputTypeName, t => {
    t.addFields({
      numAffected: {
        type: 'Int',
        description: 'Affected documents number',
      },
    });
  });

  const resolver = new tc.constructor.schemaComposer.Resolver({
    name: 'removeMany',
    kind: 'mutation',
    description:
      'Remove many documents without returning them: ' +
      'Use Query.remove mongoose method. ' +
      'Do not apply mongoose defaults, setters, hooks and validation. ',
    type: outputType,
    args: {
      ...filterHelperArgs(tc, model, {
        filterTypeName: `FilterRemoveMany${tc.getTypeName()}Input`,
        isRequired: true,
        model,
        ...(opts && opts.filter),
      }),
    },
    resolve: async (resolveParams: ExtendedResolveParams) => {
      const filterData = (resolveParams.args && resolveParams.args.filter) || {};

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        throw new Error(
          `${tc.getTypeName()}.removeMany resolver requires at least one value in args.filter`
        );
      }

      resolveParams.query = model.find();
      filterHelper(resolveParams);
      resolveParams.query = resolveParams.query.remove();

      let res;

      // `beforeQuery` is experemental feature, if you want to use it
      // please open an issue with your use case, cause I suppose that
      // this option is excessive
      if (resolveParams.beforeQuery) {
        res = await resolveParams.beforeQuery(resolveParams.query, resolveParams);
      } else {
        res = await resolveParams.query.exec();
      }

      if (res.ok) {
        // mongoose 5
        return {
          numAffected: res.n,
        };
      } else if (res.result && res.result.ok) {
        // mongoose 4
        return {
          numAffected: res.result.n,
        };
      }
      // unexpected response
      throw new Error(JSON.stringify(res));
    },
  });

  return resolver;
}
