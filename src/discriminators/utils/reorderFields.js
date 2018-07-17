/* @flow */

import { TypeComposerClass } from 'graphql-compose';
import { DiscriminatorTypeComposer } from '../DiscriminatorTypeComposer';

export function reorderFields<TContext>(
  modelTC: DiscriminatorTypeComposer<TContext> | TypeComposerClass<TContext>,
  order: string[] | boolean,
  DKey: string,
  commonFieldKeys?: string[]
) {
  if (order) {
    if (Array.isArray(order)) {
      modelTC.reorderFields(order);
    } else {
      const newOrder = [];

      // is child discriminator
      if (modelTC instanceof TypeComposerClass && commonFieldKeys) {
        newOrder.push(...commonFieldKeys);

        newOrder.filter(value => value === '_id' || value === DKey);

        newOrder.unshift('_id', DKey);
      } else {
        if (modelTC.getField('_id')) {
          newOrder.push('_id');
        }
        newOrder.push(DKey);
      }

      modelTC.reorderFields(newOrder);
    }
  }

  return modelTC;
}
