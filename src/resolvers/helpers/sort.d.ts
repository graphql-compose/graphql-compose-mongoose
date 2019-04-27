import {
  ObjectTypeComposerArgumentConfigMapDefinition,
  EnumTypeComposer,
  SchemaComposer,
  ObjectTypeComposer,
} from 'graphql-compose';
import { Model } from 'mongoose';
import { ExtendedResolveParams } from '../index';

export type SortHelperArgsOpts = {
  sortTypeName?: string;
};

export type SortHelperArgs = '_ID_ASC' | '_ID_DESC' | any;

export function sortHelperArgs(
  typeComposer: ObjectTypeComposer<any>,
  model: Model<any>,
  opts?: SortHelperArgsOpts,
): ObjectTypeComposerArgumentConfigMapDefinition;

export function sortHelper(resolveParams: ExtendedResolveParams): void;

export function getSortTypeFromModel(
  typeName: string,
  model: Model<any>,
  schemaComposer: SchemaComposer<any>,
): EnumTypeComposer;
