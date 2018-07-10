/* @flow */

import { TypeComposer } from 'graphql-compose';
import type { DiscriminatorTypeComposer, Options } from '../composeWithMongooseDiscriminators';
import { prepareChildResolvers } from './prepare-resolvers/prepareChildResolvers';
import { reorderFields } from './utils';

// copy all baseTypeComposers fields to childTC
// these are the fields before calling discriminator
function copyBaseTCFieldsToChildTC(baseDTC: TypeComposer, childTC: TypeComposer) {
  const baseFields = baseDTC.getFieldNames();
  const childFields = childTC.getFieldNames();

  for (const field of baseFields) {
    const childFieldName = childFields.find(fld => fld === field);

    if (childFieldName) {
      childTC.extendField(field, {
        type: baseDTC.getFieldType(field),
      });
    } else {
      childTC.setField(field, baseDTC.getField(field));
    }
  }

  return childTC;
}

export function composeChildTC(
  baseDTC: DiscriminatorTypeComposer,
  childTC: TypeComposer,
  opts: Options
): TypeComposer {
  const composedChildTC = copyBaseTCFieldsToChildTC(baseDTC, childTC);

  composedChildTC.setInterfaces([baseDTC.getDInterface()]);

  // Add this field, else we have Unknown type Error when we query for this field when we haven't
  // added a query that returns this type on rootQuery.
  // this is somehow i don't understand, but we don't get any type if we never query it
  // I guess under the hud, graphql-compose shakes it off.
  baseDTC.getGQC().Query.addFields({
    [`${composedChildTC.getTypeName()[0].toLowerCase() +
      composedChildTC.getTypeName().substr(1)}One`]: composedChildTC
      .getResolver('findOne')
      .clone({ name: `${composedChildTC.getTypeName()}One` })
      .setType(composedChildTC.getType()),
  });

  prepareChildResolvers(baseDTC, composedChildTC, opts);

  reorderFields(composedChildTC, opts.reorderFields, baseDTC.getDKey(), baseDTC.getFieldNames());

  return composedChildTC;
}
