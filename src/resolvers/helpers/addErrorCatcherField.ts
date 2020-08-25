import { Resolver } from 'graphql-compose';
import { getOrCreateErrorInterface } from '../../utils/getOrCreateErrorInterface';

/**
 * This helper add `error` field in payload & wraps `resolve` method.
 * It catches exception and return it in payload if user
 * requested `error` field in GraphQL-query.
 */
export function addErrorCatcherField(resolver: Resolver<any, any, any>): void {
  getOrCreateErrorInterface(resolver.schemaComposer);

  const payloadTC = resolver.getOTC();

  if (!payloadTC.hasField('error')) {
    payloadTC.setField('error', {
      type: 'ErrorInterface',
      description:
        'Error that may occur during operation. If you request this field in GraphQL query, you will receive typed error in payload; otherwise error will be provided in root `errors` field of GraphQL response.',
    });
  }

  const childResolve = resolver.resolve.bind(resolver);
  resolver.setResolve(async (rp) => {
    if (rp.projection?.error) {
      try {
        const res = await childResolve(rp);
        return res;
      } catch (error) {
        return {
          error,
        };
      }
    } else {
      return childResolve(rp);
    }
  });
}
