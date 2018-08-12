/* @flow */

import type { ResolveParams } from 'graphql-compose';
import { ResolverClass, TypeComposerClass } from 'graphql-compose';
import { type DiscriminatorOptions, DiscriminatorTypeComposer } from './DiscriminatorTypeComposer';
import { EMCResolvers } from '../resolvers';

// set the DKey as a query on filter, also project it
// Also look at it like setting for filters, makes sure to limit
// query to child type
function setQueryDKey<TSource, TContext>(
  resolver: ResolverClass<any, TContext>,
  childTC: TypeComposerClass<TContext>,
  DKey: string,
  fromField: string
) {
  if (resolver) {
    resolver.wrapResolve(next => (resolve: ResolveParams<TSource, TContext>) => {
      const DName = childTC.getTypeName();

      /* eslint no-param-reassign: 0 */
      resolve.args = resolve.args ? resolve.args : {};
      resolve.projection = resolve.projection ? resolve.projection : {};

      if (fromField === 'records') {
        resolve.args[fromField] = resolve.args[fromField] || [];
        for (const record of resolve.args[fromField]) {
          record[DKey] = DName;
        }
      } else if (fromField) {
        resolve.args[fromField] = resolve.args[fromField] ? resolve.args[fromField] : {};
        resolve.args[fromField][DKey] = DName;
      } else {
        resolve.args[DKey] = DName;
      }

      resolve.projection[DKey] = 1;
      /* eslint no-param-reassign: 1 */

      return next(resolve);
    });
  }
}

// hide the DKey on the filter or record
function hideDKey<TContext>(
  resolver: ResolverClass<any, TContext>,
  childTC: TypeComposerClass<TContext>,
  DKey: string,
  fromField: string[] | string
) {
  if (Array.isArray(fromField)) {
    for (const field of fromField) {
      hideDKey(resolver, childTC, DKey, field);
    }
  } else if (fromField && resolver.hasArg(fromField)) {
    const fieldTC = resolver.getArgTC(fromField);

    if (fieldTC) {
      fieldTC.removeField(DKey);
    }
  } else {
    resolver.removeArg(DKey);
  }
}

// Set baseDTC resolver argTypes on childTC fields shared with DInterface
function copyResolverArgTypes<TContext>(
  resolver: ResolverClass<any, TContext>,
  baseDTC: DiscriminatorTypeComposer<TContext>,
  fromArg: string[] | string
) {
  if (resolver && baseDTC.hasInputTypeComposer()) {
    if (Array.isArray(fromArg)) {
      for (const field of fromArg) {
        copyResolverArgTypes(resolver, baseDTC, field);
      }
    } else if (fromArg && resolver.hasArg(fromArg)) {
      if (
        baseDTC.hasResolver(resolver.name) &&
        baseDTC.getResolver(resolver.name).hasArg(fromArg)
      ) {
        const childResolverArgTc = resolver.getArgTC(fromArg);
        const baseResolverArgTC = baseDTC.getResolver(resolver.name).getArgTC(fromArg);
        const baseResolverArgTCFields = baseResolverArgTC.getFieldNames();

        for (const baseArgField of baseResolverArgTCFields) {
          if (childResolverArgTc.hasField(baseArgField) && baseArgField !== '_id') {
            childResolverArgTc.extendField(baseArgField, {
              type: baseResolverArgTC.getFieldType(baseArgField),
            });
          }
        }
      }
    }
  }
}

// reorder input fields resolvers, based on reorderFields opts
function reorderFieldsRecordFilter<TContext>(
  resolver: ResolverClass<any, TContext>,
  baseDTC: DiscriminatorTypeComposer<TContext>,
  order: string[] | boolean | void | null,
  fromField: string[] | string
) {
  if (order) {
    if (Array.isArray(fromField)) {
      for (const field of fromField) {
        reorderFieldsRecordFilter(resolver, baseDTC, order, field);
      }
    } else if (fromField && resolver.hasArg(fromField)) {
      const argTC = resolver.getArgTC(fromField);

      if (Array.isArray(order)) {
        argTC.reorderFields(order);
      } else {
        const newOrder = [];

        // is CDTC
        if (baseDTC.hasInputTypeComposer()) {
          newOrder.push(...baseDTC.getInputTypeComposer().getFieldNames());

          newOrder.filter(value => value === '_id' || value === baseDTC.getDKey());

          newOrder.unshift('_id', baseDTC.getDKey());
        }

        argTC.reorderFields(newOrder);
      }
    }
  }
}

export function prepareChildResolvers<TContext>(
  baseDTC: DiscriminatorTypeComposer<TContext>,
  childTC: TypeComposerClass<TContext>,
  opts: DiscriminatorOptions
) {
  for (const resolverName in EMCResolvers) {
    if (EMCResolvers.hasOwnProperty(resolverName) && childTC.hasResolver(resolverName)) {
      const resolver = childTC.getResolver(resolverName);

      switch (resolverName) {
        case EMCResolvers.createOne:
          setQueryDKey(resolver, childTC, baseDTC.getDKey(), 'record');

          hideDKey(resolver, childTC, baseDTC.getDKey(), 'record');
          break;

        case EMCResolvers.createMany:
          setQueryDKey(resolver, childTC, baseDTC.getDKey(), 'records');

          hideDKey(resolver, childTC, baseDTC.getDKey(), 'records');
          break;

        case EMCResolvers.updateById:
          hideDKey(resolver, childTC, baseDTC.getDKey(), 'record');
          break;

        case EMCResolvers.updateOne:
        case EMCResolvers.updateMany:
          setQueryDKey(resolver, childTC, baseDTC.getDKey(), 'filter');

          hideDKey(resolver, childTC, baseDTC.getDKey(), ['record', 'filter']);
          break;

        case EMCResolvers.findOne:
        case EMCResolvers.findMany:
        case EMCResolvers.removeOne:
        case EMCResolvers.removeMany:
        case EMCResolvers.count:
        case EMCResolvers.pagination:
        case EMCResolvers.connection:
          // limit remove scope to DKey
          setQueryDKey(resolver, childTC, baseDTC.getDKey(), 'filter');

          // remove DKey Field, remove from filter
          hideDKey(resolver, childTC, baseDTC.getDKey(), 'filter');
          break;
        default:
      }

      copyResolverArgTypes(resolver, baseDTC, ['filter', 'record', 'records']);
      reorderFieldsRecordFilter(resolver, baseDTC, opts.reorderFields, [
        'filter',
        'record',
        'records',
      ]);
    }
  }
}
