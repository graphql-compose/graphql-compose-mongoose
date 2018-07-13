/* @flow */

import { TypeComposer } from 'graphql-compose';
import { DiscriminatorTypeComposer } from '../DiscriminatorTypeComposer';

export function reorderFields(
  modelTC: DiscriminatorTypeComposer | TypeComposer,
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
      if (modelTC instanceof TypeComposer && commonFieldKeys) {
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
