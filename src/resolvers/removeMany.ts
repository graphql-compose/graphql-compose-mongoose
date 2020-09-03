import type { Resolver, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { filterHelperArgs, filterHelper, prepareAliases } from './helpers';
import type { ExtendedResolveParams, GenResolverOpts } from './index';
import { beforeQueryHelper } from './helpers/beforeQueryHelper';
import { addErrorCatcherField } from './helpers/errorCatcher';

export default function removeMany<TSource = Document, TContext = any>(
  model: Model<any>,
  tc: ObjectTypeComposer<TSource, TContext>,
  opts?: GenResolverOpts
): Resolver<TSource, TContext> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver removeMany() should be instance of Mongoose Model.');
  }

  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error(
      'Second arg for Resolver removeMany() should be instance of ObjectTypeComposer.'
    );
  }

  const outputTypeName = `RemoveMany${tc.getTypeName()}Payload`;
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
    name: 'removeMany',
    kind: 'mutation',
    description:
      'Remove many documents without returning them: ' +
      'Use Query.remove mongoose method. ' +
      'Do not apply mongoose defaults, setters, hooks and validation. ',
    type: outputType,
    args: {
      ...filterHelperArgs(tc, model, {
        prefix: 'FilterRemoveMany',
        suffix: 'Input',
        isRequired: true,
        ...opts?.filter,
      }),
    },
    resolve: (async (resolveParams: ExtendedResolveParams) => {
      const filterData = resolveParams?.args?.filter;

      if (!(typeof filterData === 'object') || Object.keys(filterData).length === 0) {
        throw new Error(
          `${tc.getTypeName()}.removeMany resolver requires at least one value in args.filter`
        );
      }

      resolveParams.query = model.find();
      resolveParams.model = model;
      filterHelper(resolveParams, aliases);

      // @ts-expect-error
      if (resolveParams.query.deleteMany) {
        // @ts-expect-error
        resolveParams.query = resolveParams.query.deleteMany();
      } else {
        // old mongoose
        resolveParams.query = resolveParams.query.remove();
      }

      const res = await beforeQueryHelper(resolveParams);

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
    }) as any,
  });

  // Add `error` field to payload which can catch resolver Error
  // and return it in mutation payload
  addErrorCatcherField(resolver);

  return resolver as any;
}
