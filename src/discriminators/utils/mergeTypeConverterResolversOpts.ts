import { MergeAbleHelperArgsOpts } from '../../resolvers/helpers';
import { mergeStringAndStringArraysFields } from './mergeCustomizationOptions';
import { AllResolversOpts } from 'src/resolvers';

type TypeFieldMap = {
  [fieldName: string]: any;
};

export function mergePrimitiveTypeFields(
  baseField?: any,
  childField?: any,
  argOptsTypes?: string[] | string
): any {
  if (Array.isArray(argOptsTypes)) {
    if (argOptsTypes.find((v) => v === 'boolean' || v === 'number')) {
      return mergePrimitiveTypeFields(baseField, childField, 'boolean');
    }
  }

  if (argOptsTypes === 'boolean' || argOptsTypes === 'number') {
    if (childField === undefined) {
      return baseField;
    } else {
      return childField;
    }
  }

  return childField;
}

export function mergeFilterOperatorsOptsMap(
  baseFilterOperatorField: TypeFieldMap,
  childFilterOperatorField?: TypeFieldMap
): TypeFieldMap {
  const baseOptsKeys = Object.keys(baseFilterOperatorField);
  const baseOptsTypes = {} as TypeFieldMap;
  for (const key of baseOptsKeys) {
    baseOptsTypes[key] = 'string[]';
  }

  childFilterOperatorField = mergeMapTypeFields(
    baseFilterOperatorField,
    childFilterOperatorField,
    baseOptsTypes
  );
  /* eslint-enable */

  return childFilterOperatorField;
}

export function mergeArraysTypeFields(
  baseField: any,
  childField: any,
  argOptsType: TypeFieldMap
): TypeFieldMap {
  let merged = childField !== undefined ? childField : {};
  if (Array.isArray(argOptsType)) {
    for (const argType of argOptsType) {
      if (argType === 'FilterOperatorsOptsMap') {
        merged = mergeFilterOperatorsOptsMap(baseField, merged);

        continue;
      }

      merged = mergePrimitiveTypeFields(baseField, childField, argType);

      merged = mergeStringAndStringArraysFields(baseField, merged, argType);
    }
  }

  return merged;
}

export function mergeMapTypeFields(
  baseField: TypeFieldMap,
  childField: TypeFieldMap | undefined,
  argOptsTypes: TypeFieldMap
): TypeFieldMap {
  const merged = childField === undefined ? {} : childField;

  if (argOptsTypes !== null && typeof argOptsTypes === 'object') {
    for (const argOptType in argOptsTypes) {
      if (argOptsTypes.hasOwnProperty(argOptType)) {
        if (baseField[argOptType] === undefined) {
          continue;
        }

        if (childField === undefined) {
          childField = {};
        }

        if (argOptType === 'FilterOperatorsOptsMap') {
          merged[argOptType] = mergeFilterOperatorsOptsMap(
            baseField[argOptType],
            merged[argOptType]
          );
          continue;
        }

        merged[argOptType] = mergePrimitiveTypeFields(
          baseField[argOptType],
          childField[argOptType],
          argOptsTypes[argOptType]
        );

        merged[argOptType] = mergeStringAndStringArraysFields(
          baseField[argOptType],
          merged[argOptType],
          argOptsTypes[argOptType]
        );

        merged[argOptType] = mergeArraysTypeFields(
          baseField[argOptType],
          merged[argOptType],
          argOptsTypes[argOptType]
        );
      }
    }
  }

  return merged;
}

export function mergeTypeConverterResolverOpts(
  baseTypeConverterResolverOpts?: AllResolversOpts | false,
  childTypeConverterResolverOpts?: AllResolversOpts | false
): AllResolversOpts | false | void {
  if (!baseTypeConverterResolverOpts) {
    return childTypeConverterResolverOpts;
  }

  if (!childTypeConverterResolverOpts) {
    return baseTypeConverterResolverOpts;
  }

  const mergedTypeConverterResolverOpts =
    JSON.parse(JSON.stringify(childTypeConverterResolverOpts)) || {};

  for (const baseResolverOpt in baseTypeConverterResolverOpts) {
    if (baseTypeConverterResolverOpts.hasOwnProperty(baseResolverOpt)) {
      // e.g. baseResolverArgs = [ limit, filter ]
      // @ts-expect-error
      const baseResolverArgs = baseTypeConverterResolverOpts[baseResolverOpt];
      // @ts-expect-error
      let childResolverArgs = childTypeConverterResolverOpts[baseResolverOpt];

      // e.g. { findMany: ... findById: ... }  baseResolverOpt = findById
      if (baseResolverArgs === undefined) {
        continue;
      }

      // if nothing set for child resolver set base
      if (baseResolverArgs === false && childResolverArgs === undefined) {
        mergedTypeConverterResolverOpts[baseResolverOpt] = false;
        continue;
      }

      // set to empty object in-order to reference
      if (childResolverArgs === undefined) {
        childResolverArgs = {};
      }

      // create path on merged if not available
      const mergedResolverArgs = mergedTypeConverterResolverOpts[baseResolverOpt] || {};

      // e.g. { limit: ..., filter: ... }
      for (const baseResolverArg in baseResolverArgs) {
        if (baseResolverArgs.hasOwnProperty(baseResolverArg)) {
          // @ts-expect-error
          const argOptsType = MergeAbleHelperArgsOpts[baseResolverArg];

          // e.g. {limit: ...}  baseResolverArg = limit
          if (baseResolverArgs[baseResolverArg] === undefined) {
            continue;
          }

          mergedResolverArgs[baseResolverArg] = mergePrimitiveTypeFields(
            baseResolverArgs[baseResolverArg],
            childResolverArgs[baseResolverArg],
            argOptsType
          );

          mergedResolverArgs[baseResolverArg] = mergeMapTypeFields(
            baseResolverArgs[baseResolverArg],
            mergedResolverArgs[baseResolverArg],
            argOptsType
          );

          mergedResolverArgs[baseResolverArg] = mergeArraysTypeFields(
            baseResolverArgs[baseResolverArg],
            mergedResolverArgs[baseResolverArg],
            argOptsType
          );
        }
      }
      mergedTypeConverterResolverOpts[baseResolverOpt] = mergedResolverArgs;
    }
  }

  return mergedTypeConverterResolverOpts;
}
