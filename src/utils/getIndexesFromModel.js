/* @flow */

import type { MongooseModel } from 'mongoose';

export type getIndexesFromModelOpts = {
  extractCompound?: boolean, // true by default
  skipSpecificIndexes?: boolean, // eg text, 2d, 2dsphere (true by default)
};

export type IndexT = { [fieldName: string]: any };

function isSpecificIndex(idx) {
  let hasSpecialIndex = false;
  Object.keys(idx).forEach(k => {
    if (typeof idx[k] !== 'number' && typeof idx[k] !== 'boolean') {
      hasSpecialIndex = true;
    }
  });
  return hasSpecialIndex;
}

/*
 * Get mongoose model, and return array of fields with indexes.
 *  MongooseModel  ->  [ { _id: 1 }, { name: 1, surname: -1 } ]
 */
export function getIndexesFromModel(
  mongooseModel: MongooseModel,
  opts: getIndexesFromModelOpts = {}
): IndexT[] {
  const extractCompound = opts.extractCompound === undefined ? true : Boolean(opts.extractCompound);
  const skipSpecificIndexes =
    opts.skipSpecificIndexes === undefined ? true : Boolean(opts.skipSpecificIndexes);

  const indexedFields = [];

  // add _id field if existed
  if (mongooseModel.schema.paths._id) {
    indexedFields.push({ _id: 1 });
  }

  // scan all fields on index presence [MONGOOSE FIELDS LEVEL INDEX]
  Object.keys(mongooseModel.schema.paths).forEach(name => {
    if (mongooseModel.schema.paths[name]._index) {
      indexedFields.push({ [name]: 1 }); // ASC by default
    }
  });

  // scan compound and special indexes [MONGOOSE SCHEMA LEVEL INDEXES]
  if (Array.isArray(mongooseModel.schema._indexes)) {
    mongooseModel.schema._indexes.forEach(idxData => {
      const partialIndexes = {};
      const idxFields = idxData[0];

      if (!skipSpecificIndexes || !isSpecificIndex(idxFields)) {
        if (!extractCompound) {
          indexedFields.push(idxFields);
        } else {
          // extract partial indexes from compound index
          // { name: 1, age: 1, salary: 1} -> [{name:1}, {name:1, age:1}, {name:1, age:1, salary:1}]
          Object.keys(idxFields).forEach(fieldName => {
            partialIndexes[fieldName] = idxFields[fieldName];
            indexedFields.push({ ...partialIndexes });
          });
        }
      }
    });
  }

  // filter duplicates
  const tmp = [];
  const result = indexedFields.filter(val => {
    const asString = JSON.stringify(val);
    if (tmp.indexOf(asString) > -1) return false;
    tmp.push(asString);
    return true;
  });

  return result;
}

export function getUniqueIndexes(mongooseModel: MongooseModel): IndexT[] {
  const indexedFields = [];

  // add _id field if existed
  if (mongooseModel.schema.paths._id) {
    indexedFields.push({ _id: 1 });
  }

  // scan all fields on index presence [MONGOOSE FIELDS LEVEL INDEX]
  Object.keys(mongooseModel.schema.paths).forEach(name => {
    if (mongooseModel.schema.paths[name]._index && mongooseModel.schema.paths[name]._index.unique) {
      indexedFields.push({ [name]: 1 }); // ASC by default
    }
  });

  // scan compound and special indexes [MONGOOSE SCHEMA LEVEL INDEXES]
  if (Array.isArray(mongooseModel.schema._indexes)) {
    mongooseModel.schema._indexes.forEach(idxData => {
      const idxFields = idxData[0];
      const idxCfg = idxData[1];
      if (idxCfg.unique && !isSpecificIndex(idxFields)) {
        indexedFields.push(idxFields);
      }
    });
  }

  return indexedFields;
}

export type extendByReversedIndexesOpts = {
  reversedFirst?: boolean, // false by default
};

export function extendByReversedIndexes(indexes: IndexT[], opts: extendByReversedIndexesOpts = {}) {
  const reversedFirst = opts.reversedFirst === undefined ? false : Boolean(opts.reversedFirst);

  const result: IndexT[] = [];

  indexes.forEach(indexObj => {
    let hasSpecificIndex = false;
    // https://docs.mongodb.org/manual/tutorial/sort-results-with-indexes/#sort-on-multiple-fields
    const reversedIndexObj = { ...indexObj };
    Object.keys(reversedIndexObj).forEach(f => {
      if (reversedIndexObj[f] === 1) reversedIndexObj[f] = -1;
      else if (reversedIndexObj[f] === -1) reversedIndexObj[f] = 1;
      else hasSpecificIndex = true;
    });

    if (reversedFirst) {
      if (!hasSpecificIndex) {
        result.push(reversedIndexObj);
      }
      result.push(indexObj);
    } else {
      result.push(indexObj);
      if (!hasSpecificIndex) {
        result.push(reversedIndexObj);
      }
    }
  });

  return result;
}

export function getIndexedFieldNamesForGraphQL(model: MongooseModel): string[] {
  const indexes = getIndexesFromModel(model);

  const fieldNames = [];
  indexes.forEach(indexData => {
    const keys = Object.keys(indexData);
    const clearedName = keys[0].replace(/[^_a-zA-Z0-9]/i, '__');
    fieldNames.push(clearedName);
  });

  // filter duplicates
  const uniqueNames = [];
  const result = fieldNames.filter(val => {
    if (uniqueNames.indexOf(val) > -1) return false;
    uniqueNames.push(val);
    return true;
  });

  return result;
}
