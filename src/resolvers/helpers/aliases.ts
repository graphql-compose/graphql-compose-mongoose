import type { Model, Schema } from 'mongoose';
import { isObject } from 'graphql-compose';

export interface NestedAliasesMap {
  __selfAlias?: string; // if object has alias, then it be written here and its field aliases below
  [userFieldName: string]: string | NestedAliasesMap | undefined;
}

export type AliasesMap = Record<string, string>;

export function prepareAliases(model: Model<any>): AliasesMap | false {
  const aliases = (model?.schema as any)?.aliases || {};

  if (model.discriminators) {
    Object.keys(model.discriminators).forEach((subModelName: string) => {
      const subModel: Model<any> = (model.discriminators as any)[subModelName];
      Object.assign(aliases, (subModel?.schema as any)?.aliases);
    });
  }
  if (Object.keys(aliases).length > 0) {
    return aliases;
  }
  return false;
}

export function prepareAliasesReverse(schema: Schema<any>): AliasesMap | false {
  const aliases = (schema as any)?.aliases;
  const keys = Object.keys(aliases);
  if (keys.length > 0) {
    const r = {} as AliasesMap;
    keys.forEach((k) => {
      r[aliases[k]] = k;
    });
    return r;
  }
  return false;
}

export function replaceAliases(
  data: Record<string, any>,
  aliases?: NestedAliasesMap
): Record<string, any> {
  if (aliases) {
    const res = { ...data };
    Object.keys(data).forEach((key) => {
      if (aliases?.[key]) {
        const alias = aliases?.[key];
        let aliasValue;
        if (typeof alias === 'string') {
          aliasValue = alias;
        } else if (isObject(alias)) {
          aliasValue = alias?.__selfAlias;
        }

        res[aliasValue || key] = isObject(res[key])
          ? replaceAliases(res[key], isObject(alias) ? alias : undefined)
          : res[key];

        if (aliasValue) {
          delete res[key];
        }
      }
    });
    return res;
  }
  return data;
}

export function prepareNestedAliases(
  schema: Schema<any>,
  preparedAliases = new Map<Schema<any>, NestedAliasesMap | undefined>()
): NestedAliasesMap | undefined {
  if (preparedAliases.has(schema)) {
    return preparedAliases.get(schema);
  }

  const aliases = {} as NestedAliasesMap;
  preparedAliases.set(schema, aliases);

  const discriminators = (schema as any).discriminators;
  if (discriminators) {
    Object.keys(discriminators).forEach((discSchemaName: string) => {
      const discSchema: Schema<any> = (discriminators as any)[discSchemaName];
      const additionalAliases = prepareNestedAliases(discSchema, preparedAliases);
      Object.assign(aliases, additionalAliases);
    });
  }

  Object.keys(schema.paths).forEach((path) => {
    const field = schema.paths[path];
    let fieldName = path;
    if ((field as any)?.options?.alias) {
      fieldName = (field as any)?.options?.alias;
      aliases[fieldName] = path;
    }
    if ((field as any)?.schema) {
      const nestedSchema = (field as any)?.schema;
      const nestedAliases = prepareNestedAliases(nestedSchema, preparedAliases);
      if (nestedAliases) {
        const topKey = aliases[fieldName];
        if (topKey && typeof topKey === 'string') {
          aliases[fieldName] = {
            __selfAlias: topKey,
          };
        }
        aliases[fieldName] = Object.assign(aliases[fieldName] || {}, nestedAliases);
      }
    }
  });

  if (!Object.keys(aliases).length) {
    preparedAliases.set(schema, undefined);
    return undefined;
  }
  return aliases;
}
