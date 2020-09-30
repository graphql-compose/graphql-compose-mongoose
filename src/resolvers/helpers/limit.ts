import type { ObjectTypeComposerArgumentConfigMapDefinition } from 'graphql-compose';
import type { ExtendedResolveParams } from '../index';

export type LimitHelperArgsOpts = {
  /**
   * Set limit for default number of returned records
   * if it does not provided in query.
   * By default: 100
   */
  defaultValue?: number;
};

// for merging, discriminators merge-able only
export const getLimitHelperArgsOptsMap = (): Record<string, string> => ({ defaultValue: 'number' });

export function limitHelperArgs(
  opts?: LimitHelperArgsOpts
): ObjectTypeComposerArgumentConfigMapDefinition<{ limit: any }> {
  return {
    limit: {
      type: 'Int',
      defaultValue: opts?.defaultValue || 100,
    },
  };
}

export function limitHelper(resolveParams: ExtendedResolveParams): void {
  const limit = parseInt(resolveParams.args?.limit, 10) || 0;
  if (limit > 0) {
    resolveParams.query = resolveParams.query.limit(limit);
  }
}
