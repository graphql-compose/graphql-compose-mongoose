import { InputTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { ExtendedResolveParams } from '../index';
import { FilterHelperArgsOpts } from './filter';

export type FilterOperatorNames = 'gt' | 'gte' | 'lt' | 'lte' | 'ne' | 'in[]' | 'nin[]';

export const OPERATORS_FIELDNAME: string;

export type FilterOperatorsOpts = {
  [fieldName: string]: FilterOperatorNames[] | false,
};

export function addFilterOperators(
  itc: InputTypeComposer,
  model: Model<any>,
  opts: FilterHelperArgsOpts): void;

export function processFilterOperators(
  filter: object,
  resolveParams: ExtendedResolveParams): void;
