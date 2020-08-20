import { ObjectTypeComposerArgumentConfigMapDefinition, ObjectTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { MongoId } from '../../types/mongoid';
import { ExtendedResolveParams } from '../index';
import { FilterOperatorsArgs } from './filterOperators';


export type FilterHelperArgsOpts = {
  filterTypeName?: string;
  isRequired?: boolean;
  onlyIndexed?: boolean;
  operators?: any;
};

export type FilterHelperArgs<TSource = any, IndexedFieldsMap = { _id: MongoId }> = TSource &
  FilterOperatorsArgs<TSource, IndexedFieldsMap>

export function getFilterHelperArgOptsMap(): Partial<
  Record<keyof FilterHelperArgsOpts, string | string[]>
>;

export function filterHelperArgs(
  typeComposer: ObjectTypeComposer<any>,
  model: Model<any>,
  opts?: FilterHelperArgsOpts
): ObjectTypeComposerArgumentConfigMapDefinition;
import { AliasesMap } from './aliases';

export function filterHelper(
  resolveParams: ExtendedResolveParams,
  aliases: AliasesMap | false
): void;
