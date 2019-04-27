import { ObjectTypeComposerArgumentConfigMapDefinition } from 'graphql-compose';
import { ExtendedResolveParams } from '../index';

export type LimitHelperArgsOpts = {
  defaultValue?: number;
};

export type LimitHelperArgs = number;

export function getLimitHelperArgsOptsMap(): Partial<
  Record<keyof LimitHelperArgsOpts, string | string[]>
>;

export function limitHelperArgs(
  opts?: LimitHelperArgsOpts,
): ObjectTypeComposerArgumentConfigMapDefinition;

export function limitHelper(resolveParams: ExtendedResolveParams): void;
