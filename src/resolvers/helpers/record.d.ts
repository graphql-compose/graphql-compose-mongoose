import { ComposeFieldConfigArgumentMap, TypeComposer } from 'graphql-compose';

export type RecordHelperArgsOpts = {
  recordTypeName?: string;
  isRequired?: boolean;
  removeFields?: string[];
  requiredFields?: string[];
};

export function getRecordHelperArgsOptsMap(): Partial<
  Record<keyof RecordHelperArgsOpts, string | string[]>
>;

export function recordHelperArgs(
  tc: TypeComposer<any>,
  opts?: RecordHelperArgsOpts,
): ComposeFieldConfigArgumentMap;
