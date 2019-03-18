/* @flow */

import { ComposeWithMongooseOpts } from '../../composeWithMongoose';
import { mergeTypeConverterResolverOpts } from './mergeTypeConverterResolversOpts';

type FieldMap = {
  [fieldName: string]: string[] | void;
};

export function mergeStringAndStringArraysFields(
  baseField?: string[] | string,
  childField?: string[] | string,
  argOptsTypes?: string[] | string,
): string[] | void;

export function mergeFieldMaps(
  baseFieldMap?: FieldMap,
  childFieldMap?: FieldMap,
): FieldMap | void;

export function mergeCustomizationOptions<TContext>(
  baseCOptions: ComposeWithMongooseOpts<TContext>,
  childCOptions?: ComposeWithMongooseOpts<TContext>,
): ComposeWithMongooseOpts<TContext> | void;
