import { ComposeFieldConfigArgumentMap } from 'graphql-compose';
import { ExtendedResolveParams } from '../index';

export function skipHelperArgs(): ComposeFieldConfigArgumentMap;

export function skipHelper(resolveParams: ExtendedResolveParams): void;
