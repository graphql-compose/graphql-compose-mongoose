import { ComposeFieldConfigArgumentMap } from 'graphql-compose';
import { ExtendedResolveParams } from '../index';

export type SkipHelperArgs = number;

export function skipHelperArgs(): ComposeFieldConfigArgumentMap;

export function skipHelper(resolveParams: ExtendedResolveParams): void;
