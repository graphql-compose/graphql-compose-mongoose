import { Model } from 'mongoose';

export type getIndexesFromModelOpts = {
  extractCompound?: boolean;
  skipSpecificIndexes?: boolean;
};

export type IndexT = { [fieldName: string]: any };

export function getIndexesFromModel(
  mongooseModel: Model<any>,
  opts?: getIndexesFromModelOpts,
): IndexT[];

export function getUniqueIndexes(mongooseModel: Model<any>): IndexT[];

export type ExtendByReversedIndexesOpts = {
  reversedFirst?: boolean;
};

export function extendByReversedIndexes(
  indexes: IndexT[],
  opts?: ExtendByReversedIndexesOpts,
): IndexT[];

export function getIndexedFieldNamesForGraphQL(model: Model<any>): string[];
