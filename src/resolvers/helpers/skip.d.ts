import { ObjectTypeComposerArgumentConfigMapDefinition } from 'graphql-compose';
import { ExtendedResolveParams } from '../index';

export type SkipHelperArgs = number;

export function skipHelperArgs(): ObjectTypeComposerArgumentConfigMapDefinition;

export function skipHelper(resolveParams: ExtendedResolveParams): void;
