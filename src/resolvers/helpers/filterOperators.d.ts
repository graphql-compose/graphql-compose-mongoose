import { InputTypeComposer } from 'graphql-compose';
import { Model } from 'mongoose';
import { ExtendedResolveParams } from '../index';
import { FilterHelperArgs, FilterHelperArgsOpts } from './filter';

export const OPERATORS_FIELDNAME: '_operators';

export type FilterOperatorNames =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'ne'
  | 'in[]'
  | 'nin[]';

type PlainOperatorNames = Exclude<FilterOperatorNames, 'in[]' | 'nin[]'>;
type ArrayOperatorNames = 'in' | 'nin';

type PlainOperatorFieldTypeMap<FieldType> = Record<
  PlainOperatorNames,
  FieldType
>;
type ArrayOperatorFieldTypeMap<FieldType> = Record<
  ArrayOperatorNames,
  FieldType[]
>;

// IndexedFieldsMap = { fieldName: type }
export type Filter_operatorsArgs<IndexedFieldMap> = {
  [fieldName in keyof IndexedFieldMap]: PlainOperatorFieldTypeMap<
    IndexedFieldMap[fieldName]
  > &
    ArrayOperatorFieldTypeMap<IndexedFieldMap[fieldName]>
};

export type FilterOperatorsArgs<TSource, IndexedFieldsMap> = {
  _operators: Filter_operatorsArgs<IndexedFieldsMap>;
  OR: FilterHelperArgs<TSource>;
  AND: FilterHelperArgs<TSource>;
};

export type FilterOperatorsOpts = {
  [fieldName: string]: FilterOperatorNames[] | false;
};

export function addFilterOperators(
  itc: InputTypeComposer,
  model: Model<any>,
  opts: FilterHelperArgsOpts,
): void;

export function processFilterOperators(
  filter: object,
  resolveParams: ExtendedResolveParams,
): void;
