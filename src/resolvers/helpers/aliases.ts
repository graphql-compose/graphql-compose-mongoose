import type { Model } from 'mongoose';

export type AliasesMap = {
  [key: string]: string;
};

export function prepareAliases(model: Model<any>): AliasesMap | false {
  const aliases = (model?.schema as any)?.aliases || {};

  if (model.discriminators) {
    Object.keys(model.discriminators).forEach((subModelName: string) => {
      const submodel: Model<any> = (model.discriminators as any)[subModelName];
      Object.assign(aliases, (submodel?.schema as any)?.aliases);
    });
  }
  if (Object.keys(aliases).length > 0) {
    return aliases;
  }
  return false;
}

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
