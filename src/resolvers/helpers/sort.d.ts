import {
  ComposeFieldConfigArgumentMap,
  EnumTypeComposer,
  SchemaComposer,
  TypeComposer,
} from 'graphql-compose';
import { Model } from 'mongoose';
import { ExtendedResolveParams } from '../index';

export type SortHelperArgsOpts = {
  sortTypeName?: string;
};

export type SortHelperArgs = '_ID_ASC' | '_ID_DESC' | any;

export function sortHelperArgs(
  typeComposer: TypeComposer<any>,
  model: Model<any>,
  opts?: SortHelperArgsOpts,
): ComposeFieldConfigArgumentMap;

export function sortHelper(resolveParams: ExtendedResolveParams): void;

export function getSortTypeFromModel(
  typeName: string,
  model: Model<any>,
  schemaComposer: SchemaComposer<any>,
): EnumTypeComposer;
