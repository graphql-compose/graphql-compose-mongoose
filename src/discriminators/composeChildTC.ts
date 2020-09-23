import { ObjectTypeComposer } from 'graphql-compose';
import type {
  DiscriminatorTypeComposer,
  ComposeWithMongooseDiscriminatorsOpts,
} from './DiscriminatorTypeComposer';
import { prepareChildResolvers } from './prepareChildResolvers';
import { reorderFields } from './utils/reorderFields';

function copyBaseTcRelationsToChildTc(
  baseDTC: ObjectTypeComposer<any, any>,
  childTC: ObjectTypeComposer<any, any>
) {
  const relations = baseDTC.getRelations();
  const childRelations = childTC.getRelations();
  Object.keys(relations).forEach((name) => {
    if (childRelations[name]) {
      return;
    }
    childTC.addRelation(name, relations[name]);
  });

  return childTC;
}

// copy all baseTypeComposer fields to childTC
// these are the fields before calling discriminator
function copyBaseTCFieldsToChildTC(
  baseDTC: ObjectTypeComposer<any, any>,
  childTC: ObjectTypeComposer<any, any>
) {
  const baseFields = baseDTC.getFieldNames();
  const childFields = childTC.getFieldNames();

  for (const field of baseFields) {
    const isFieldExists = childFields.find((fld) => fld === field);

    if (isFieldExists) {
      childTC.extendField(field, {
        type: baseDTC.getField(field).type,
      });
    } else {
      childTC.setField(field, baseDTC.getField(field));
    }
  }

  return childTC;
}

export function composeChildTC<TSource, TContext>(
  baseDTC: DiscriminatorTypeComposer<any, TContext>,
  childTC: ObjectTypeComposer<TSource, TContext>,
  opts: ComposeWithMongooseDiscriminatorsOpts<TContext>
): ObjectTypeComposer<TSource, TContext> {
  let composedChildTC = copyBaseTcRelationsToChildTc(baseDTC, childTC);
  composedChildTC = copyBaseTCFieldsToChildTC(baseDTC, composedChildTC);

  composedChildTC.addInterface(baseDTC.getDInterface());

  prepareChildResolvers(baseDTC, composedChildTC, opts);

  reorderFields(composedChildTC, opts.reorderFields, baseDTC.getDKey(), baseDTC.getFieldNames());

  return composedChildTC;
}
