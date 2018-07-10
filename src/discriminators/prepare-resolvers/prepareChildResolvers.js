/* @flow */

import type { ResolveParams } from 'graphql-compose';
import { Resolver, TypeComposer } from 'graphql-compose';
import type { Options } from '../../composeWithMongooseDiscriminators';
import { DiscriminatorTypeComposer } from '../../composeWithMongooseDiscriminators';
import { EMCResolvers } from '../../resolvers';

// set the DKey as a query on filter, also project it
// Also look at it like setting for filters, makes sure to limit
// query to child type
function setQueryDKey<TSource, TContext>(
  resolver: Resolver,
  childTC: TypeComposer,
  DKey: string,
  fromField: string
) {
  if (resolver) {
    resolver.wrapResolve(next => (resolve: ResolveParams<TSource, TContext>) => {
      const DName = childTC.getTypeName();

      /* eslint no-param-reassign: 0 */
      resolve.args = resolve.args ? resolve.args : {};
      resolve.projection = resolve.projection ? resolve.projection : {};

      if (fromField) {
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
function hideDKey(
  resolver: Resolver,
  childTC: TypeComposer,
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

// makes sure that all input fields are same as that on Interface,
// that is all should be same as base typeComposer types
// only changes for common properties, executed only once, on discriminator creation
function setBaseInputTypesOnChildInputTypes(
  resolver: Resolver,
  baseDTC: DiscriminatorTypeComposer,
  fromField: string[] | string
) {
  // set sharedField types on input types
  if (resolver && baseDTC.hasInputTypeComposer()) {
    if (Array.isArray(fromField)) {
      for (const field of fromField) {
        setBaseInputTypesOnChildInputTypes(resolver, baseDTC, field);
      }
    } else if (fromField && resolver.hasArg(fromField)) {
      const argTc = resolver.getArgTC(fromField);

      const baseITCFields = baseDTC.getInputTypeComposer().getFieldNames();

      for (const baseField of baseITCFields) {
        if (argTc.hasField(baseField) && baseField !== '_id') {
          argTc.extendField(baseField, {
            type: baseDTC.getInputTypeComposer().getFieldType(baseField),
          });
        }
      }
    }
  }
}

// reorder input fields resolvers, based on reorderFields opts
function reorderFieldsRecordFilter(
  resolver: Resolver,
  baseDTC: DiscriminatorTypeComposer,
  order: string[] | boolean,
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

export function prepareChildResolvers(
  baseDTC: DiscriminatorTypeComposer,
  childTC: TypeComposer,
  opts: Options
) {
  for (const resolverName in EMCResolvers) {
    if (childTC.hasResolver(resolverName)) {
      const resolver = childTC.getResolver(resolverName);

      switch (resolverName) {
        case EMCResolvers.createOne:
          setQueryDKey(resolver, childTC, baseDTC.getDKey(), 'record');

          hideDKey(resolver, childTC, baseDTC.getDKey(), 'record');
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

      setBaseInputTypesOnChildInputTypes(resolver, baseDTC, ['filter', 'record']);
      reorderFieldsRecordFilter(resolver, baseDTC, opts.reorderFields, ['filter', 'record']);
    }
  }
}
