/* @flow */

import { TypeConverterResolversOpts } from '../../composeWithMongoose';
import { MergeAbleHelperArgsOpts } from '../../resolvers/helpers';
import { mergeStringAndStringArraysFields } from './mergeCustomizationOptions';

type TypeFieldMap = {
  [fieldName: string]: any;
};

export function mergePrimitiveTypeFields(
  baseField?: any,
  childField?: any,
  argOptsTypes?: string[] | string,
): any;

export function mergeFilterOperatorsOptsMap(
  baseFilterOperatorField: TypeFieldMap,
  childFilterOperatorField?: TypeFieldMap,
): TypeFieldMap;

export function mergeArraysTypeFields(
  baseField: any,
  childField: any,
  argOptsType: TypeFieldMap,
): {};

export function mergeMapTypeFields(
  baseField: any,
  childField: any,
  argOptsTypes: TypeFieldMap,
): {};

export function mergeTypeConverterResolverOpts(
  baseTypeConverterResolverOpts?: TypeConverterResolversOpts | false,
  childTypeConverterResolverOpts?: TypeConverterResolversOpts | false,
): TypeConverterResolversOpts | false | void;
