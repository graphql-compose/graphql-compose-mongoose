/* @flow */

import type { ResolveParams } from 'graphql-compose';
import { Resolver } from 'graphql-compose';
import {
  ChildDiscriminatorTypeComposer,
  DiscriminatorTypeComposer,
  EMCResolvers,
} from '../composeWithMongooseDiscriminators';

// set the DKey as a query on filter, also project it
// Also look at it like setting for filters, makes sure to limit
// query to child type
function setQueryDKey<TSource, TContext>(
  resolver: Resolver,
  childTC: ChildDiscriminatorTypeComposer,
  fromField: string
) {
  if (resolver) {
    resolver.wrapResolve(next => (resolve: ResolveParams<TSource, TContext>) => {
      const DKey = childTC.getDKey();

      const DName = childTC.getDName();

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
  childTC: ChildDiscriminatorTypeComposer,
  fromField: string[] | string
) {
  if (Array.isArray(fromField)) {
    for (const field of fromField) {
      hideDKey(resolver, childTC, field);
    }
  } else if (fromField && resolver.hasArg(fromField)) {
    const fieldTC = resolver.getArgTC(fromField);

    if (fieldTC) {
      fieldTC.removeField(childTC.getDKey());
    }
  } else {
    resolver.removeArg(childTC.getDKey());
  }
}

// makes sure that all input fields are same as that on Interface,
// that is all should be same as base typeComposer types
// only changes for common properties, executed only once, on discriminator creation
function setBaseInputTypesOnInputTypes(
  resolver: Resolver,
  baseTC: DiscriminatorTypeComposer,
  fromField: string[] | string
) {
  // set sharedField types on input types
  if (resolver && baseTC.hasInputTypeComposer()) {
    if (Array.isArray(fromField)) {
      for (const field of fromField) {
        setBaseInputTypesOnInputTypes(resolver, baseTC, field);
      }
    } else if (fromField && resolver.hasArg(fromField)) {
      const argTc = resolver.getArgTC(fromField);

      const baseITCFields = baseTC.getInputTypeComposer().getFieldNames();

      for (const baseField of baseITCFields) {
        if (argTc.hasField(baseField) && baseField !== '_id') {
          argTc.extendField(baseField, {
            type: baseTC.getInputTypeComposer().getFieldType(baseField),
          });
        }
      }
    }
  }
}

// reorder input fields resolvers, based on reorderFields opts
function reorderFieldsRecordFilter(
  resolver: Resolver,
  baseTC: DiscriminatorTypeComposer,
  order: string[] | boolean,
  fromField: string[] | string
) {
  if (order) {
    if (Array.isArray(fromField)) {
      for (const field of fromField) {
        reorderFieldsRecordFilter(resolver, baseTC, order, field);
      }
    } else if (fromField && resolver.hasArg(fromField)) {
      const argTC = resolver.getArgTC(fromField);

      if (Array.isArray(order)) {
        argTC.reorderFields(order);
      } else {
        const newOrder = [];

        // is CDTC
        if (baseTC.hasInputTypeComposer()) {
          newOrder.push(...baseTC.getInputTypeComposer().getFieldNames());

          newOrder.filter(value => value === '_id' || value === baseTC.getDKey());

          newOrder.unshift('_id', baseTC.getDKey());
        }

        argTC.reorderFields(newOrder);
      }
    }
  }
}

export function recomposeChildResolvers(childTC: ChildDiscriminatorTypeComposer) {
  for (const resolverName in EMCResolvers) {
    if (childTC.hasResolver(resolverName)) {
      const resolver = childTC.getResolver(resolverName);

      switch (resolverName) {
        case EMCResolvers.createOne:
          setQueryDKey(resolver, childTC, 'record');

          hideDKey(resolver, childTC, 'record');
          break;

        case EMCResolvers.updateById:
          hideDKey(resolver, childTC, 'record');
          break;

        case EMCResolvers.updateOne:
        case EMCResolvers.updateMany:
          setQueryDKey(resolver, childTC, 'filter');

          hideDKey(resolver, childTC, ['record', 'filter']);
          break;

        case EMCResolvers.findOne:
        case EMCResolvers.findMany:
        case EMCResolvers.removeOne:
        case EMCResolvers.removeMany:
        case EMCResolvers.count:
        case EMCResolvers.pagination:
        case EMCResolvers.connection:
          // limit remove scope to DKey
          setQueryDKey(resolver, childTC, 'filter');

          // remove DKey Field, remove from filter
          hideDKey(resolver, childTC, 'filter');
          break;
        default:
      }

      setBaseInputTypesOnInputTypes(resolver, childTC.getDTC(), ['filter', 'record']);
      reorderFieldsRecordFilter(
        resolver,
        childTC.getDTC(),
        childTC.getDTC().getOpts().reorderFields,
        ['filter', 'record']
      );
    }
  }
}
