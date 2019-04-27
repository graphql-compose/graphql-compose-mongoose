import {
  ObjectTypeComposerArgumentConfigMapDefinition,
  ObjectTypeComposer,
} from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../../types/mongoid';
import { ExtendedResolveParams } from '../index';
import { FilterOperatorsArgs, FilterOperatorsOpts } from './filterOperators';

export type FilterHelperArgsOpts = {
  filterTypeName?: string;
  isRequired?: boolean;
  onlyIndexed?: boolean;
  requiredFields?: string | string[];
  operators?: FilterOperatorsOpts | false;
  removeFields?: string | string[];
};

export type FilterHelperArgs<
  TSource = any,
  IndexedFieldsMap = { _id: MongoId }
> = TSource &
  FilterOperatorsArgs<TSource, IndexedFieldsMap> & {
    _ids: MongoId[];
  };

export function getFilterHelperArgOptsMap(): Partial<
  Record<keyof FilterHelperArgsOpts, string | string[]>
>;

export function filterHelperArgs(
  typeComposer: ObjectTypeComposer<any>,
  model: Model<any>,
  opts?: FilterHelperArgsOpts,
): ObjectTypeComposerArgumentConfigMapDefinition;

export function filterHelper(resolveParams: ExtendedResolveParams): void;
