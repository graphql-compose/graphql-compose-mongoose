/* @flow */

import type { MongooseModel } from 'mongoose';

export type AliasesMap = {
  [key: string]: string,
};

export function prepareAliases(model: MongooseModel): AliasesMap | false {
  const aliases = (model?.schema: any)?.aliases;
  if (Object.keys(aliases).length > 0) {
    return aliases;
  }
  return false;
}

export function replaceAliases(data: Object, aliases: AliasesMap | false): Object {
  if (aliases) {
    const res = { ...data };
    Object.keys(data).forEach((k) => {
      if (aliases[k]) {
        res[aliases[k]] = res[k];
        delete res[k];
      }
    });
    return res;
  }
  return data;
}
