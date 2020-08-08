import { Model } from 'mongoose';

export type AliasesMap = Record<string, string>;

export function prepareAliases(model: Model<any>): AliasesMap | false;

export function replaceAliases(
  data: Record<string, any>,
  aliases: AliasesMap | false
): Record<string, any>;
