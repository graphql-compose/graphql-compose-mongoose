/* @flow */

import { TypeComposer } from 'graphql-compose';
import type { DiscriminatorTypeComposer, DiscriminatorOptions } from './DiscriminatorTypeComposer';
import { prepareChildResolvers } from './prepareChildResolvers';
import { reorderFields } from './utils/reorderFields';

// copy all baseTypeComposer fields to childTC
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
  baseDTC: DiscriminatorTypeComposer<any>,
  childTC: TypeComposer,
  opts: DiscriminatorOptions
): TypeComposer {
  const composedChildTC = copyBaseTCFieldsToChildTC(baseDTC, childTC);

  composedChildTC.setInterfaces([baseDTC.getDInterface()]);

  prepareChildResolvers(baseDTC, composedChildTC, opts);

  reorderFields(
    composedChildTC,
    (opts: any).reorderFields,
    baseDTC.getDKey(),
    baseDTC.getFieldNames()
  );

  return composedChildTC;
}
