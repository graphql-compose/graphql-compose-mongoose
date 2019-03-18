/* @flow */

import type { ComposeWithMongooseOpts } from '../../composeWithMongoose';
import { mergeTypeConverterResolverOpts } from './mergeTypeConverterResolversOpts';

type FieldMap = {
  [fieldName: string]: string[] | typeof undefined,
};

export function mergeStringAndStringArraysFields(
  baseField?: string[] | string,
  childField?: string[] | string,
  argOptsTypes?: string[] | string
): string[] | typeof undefined {
  if (Array.isArray(argOptsTypes)) {
    if (argOptsTypes.find(v => v === 'string' || v === 'string[]')) {
      return mergeStringAndStringArraysFields(baseField, childField, 'string');
    }
  }

  let merged = childField;

  if (argOptsTypes === 'string' || argOptsTypes === 'string[]') {
    if (!baseField) {
      if (childField) {
        return Array.isArray(childField) ? childField : [childField];
      }
      return undefined;
    }

    if (!childField) {
      if (baseField) {
        return Array.isArray(baseField) ? baseField : [baseField];
      }
      return undefined;
    }

    merged = Array.of(
      ...(Array.isArray(baseField) ? baseField : [baseField]),
      ...(Array.isArray(childField) ? childField : [childField])
    );

    let length = merged.length;

    for (let i = 0; i <= length; i++) {
      for (let j = i + 1; j < length; j++) {
        if (merged[i] === merged[j]) {
          merged.splice(j, 1);
          length--;
        }
      }
    }
  }

  return (merged: any);
}

export function mergeFieldMaps(
  baseFieldMap?: FieldMap,
  childFieldMap?: FieldMap
): FieldMap | typeof undefined {
  if (!baseFieldMap) {
    return childFieldMap;
  }

  const mergedFieldMap = childFieldMap || {};

  for (const key in baseFieldMap) {
    if (baseFieldMap.hasOwnProperty(key)) {
      mergedFieldMap[key] = mergeStringAndStringArraysFields(
        baseFieldMap[key],
        mergedFieldMap[key],
        'string'
      );
    }
  }

  return mergedFieldMap;
}

export function mergeCustomizationOptions<TContext>(
  baseCOptions: ComposeWithMongooseOpts<TContext>,
  childCOptions?: ComposeWithMongooseOpts<TContext>
): ComposeWithMongooseOpts<TContext> | void {
  if (!baseCOptions) {
    return childCOptions;
  }

  const mergedOptions: ComposeWithMongooseOpts<TContext> = childCOptions || ({}: any);

  if (
    baseCOptions.schemaComposer !== mergedOptions.schemaComposer &&
    mergedOptions.schemaComposer
  ) {
    throw new Error(
      '[Discriminators] ChildModels should have same schemaComposer as its BaseModel'
    );
  }

  // use base schemaComposer
  mergedOptions.schemaComposer = baseCOptions.schemaComposer;

  // merge fields map
  if (baseCOptions.fields) {
    mergedOptions.fields = (mergeFieldMaps(
      (baseCOptions.fields: any),
      (mergedOptions.fields: any)
    ): any);
  }

  // merge inputType fields map
  if (baseCOptions.inputType && baseCOptions.inputType.fields) {
    if (mergedOptions.inputType) {
      (mergedOptions.inputType: any).fields = (mergeFieldMaps(
        (baseCOptions.inputType.fields: any),
        (mergedOptions.inputType.fields: any)
      ): any);
    } else {
      mergedOptions.inputType = {
        fields: (mergeFieldMaps((baseCOptions.inputType.fields: any), undefined): any),
      };
    }
  }

  mergedOptions.resolvers = mergeTypeConverterResolverOpts(
    baseCOptions.resolvers,
    mergedOptions.resolvers
  );

  return mergedOptions;
}
