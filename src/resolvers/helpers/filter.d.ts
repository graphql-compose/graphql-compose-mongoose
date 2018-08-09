import { ComposeFieldConfigArgumentMap, TypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { ExtendedResolveParams } from '../index';
import { FilterOperatorsOpts } from './filterOperators';

export type FilterHelperArgsOpts = {
  filterTypeName?: string,
  isRequired?: boolean,
  onlyIndexed?: boolean,
  requiredFields?: string | string[],
  operators?: FilterOperatorsOpts | false,
  removeFields?: string | string[],
};

export function getFilterHelperArgOptsMap(): Partial<Record<keyof FilterHelperArgsOpts, string | string[]>>;

export function filterHelperArgs(
  typeComposer: TypeComposer<any>,
  model: Model<any>,
  opts?: FilterHelperArgsOpts): ComposeFieldConfigArgumentMap;

export function filterHelper(resolveParams: ExtendedResolveParams): void;
