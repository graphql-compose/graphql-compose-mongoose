/* @flow */
/* eslint-disable no-param-reassign */

import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import {
  limitHelper,
  limitHelperArgs,
  skipHelper,
  skipHelperArgs,
  recordHelperArgs,
  filterHelper,
  filterHelperArgs,
  sortHelper,
  sortHelperArgs,
  prepareAliases,
  replaceAliases,
} from './helpers';
import { toMongoDottedObject } from '../utils/toMongoDottedObject';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';

export default function updateMany<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver updateMany() should be instance of Mongoose Model.');
  }
  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver updateMany() should be instance of ObjectTypeComposer.'
    );
  }

  const outputTypeName = `UpdateMany${tc.getTypeName()}Payload`;
  const outputType = tc.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
    t.addFields({
      numAffected: {
        type: 'Int',
        description: 'Affected documents number',
      },
    });
  });

  const aliases = prepareAliases(model);

  const resolver = tc.schemaComposer.createResolver({
    name: 'updateMany',
    kind: 'mutation',
    description:
      'Update many documents without returning them: ' +
      'Use Query.update mongoose method. ' +
      'Do not apply mongoose defaults, setters, hooks and validation. ',
    type: outputType,
    args: {
      ...recordHelperArgs(tc, {
        recordTypeName: `UpdateMany${tc.getTypeName()}Input`,
        removeFields: ['id', '_id'],
        isRequired: true,
        allFieldsNullable: true,
        ...opts?.record,
      }),
      ...filterHelperArgs(tc, model, {
        filterTypeName: `FilterUpdateMany${tc.getTypeName()}Input`,
        ...opts?.filter,
      }),
      ...sortHelperArgs(tc, model, {
        sortTypeName: `SortUpdateMany${tc.getTypeName()}Input`,
        ...opts?.sort,
      }),
      ...skipHelperArgs(),
      ...limitHelperArgs({
        ...opts?.limit,
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams) => {
      const recordData = (resolveParams.args && resolveParams.args.record) || {};

      if (!(typeof recordData === 'object') || Object.keys(recordData).length === 0) {
        return Promise.reject(
          new Error(
            `${tc.getTypeName()}.updateMany resolver requires ` +
              'at least one value in args.record'
          )
        );
      }

      resolveParams.query = model.find();
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);
      skipHelper(resolveParams);
      sortHelper(resolveParams);
      limitHelper(resolveParams);

      resolveParams.query = resolveParams.query.setOptions({ multi: true }); // eslint-disable-line

      // @ts-expect-error
      if (resolveParams.query.updateMany) {
        // @ts-expect-error
        resolveParams.query.updateMany({
          $set: toMongoDottedObject(replaceAliases(recordData, aliases)),
        });
      } else {
        // OLD mongoose
        resolveParams.query.update({
          $set: toMongoDottedObject(replaceAliases(recordData, aliases)),
        });
      }

      const res = await beforeQueryHelper(resolveParams);

      if (res.ok) {
        return {
          numAffected: res.n || res.nModified,
        };
      }

      // unexpected response
      throw new Error(JSON.stringify(res));
    }) as any,
  });

  return resolver;
}
