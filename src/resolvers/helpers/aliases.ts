import type { Model } from 'mongoose';

export type AliasesMap = {
  [key: string]: string;
};

export function prepareAliases(model: Model<any>): AliasesMap | false {
  const aliases = (model?.schema as any)?.aliases;
  if (Object.keys(aliases).length > 0) {
    return aliases;
  }
  return false;
}

// TODO: change by translateAliases()
// @see https://github.com/Automattic/mongoose/issues/6427
export function replaceAliases(
  data: Record<string, any>,
  aliases: AliasesMap | false
): Record<string, any> {
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
