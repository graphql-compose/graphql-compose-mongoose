import { Resolver } from 'graphql-compose';
import { getErrorInterface, ValidationError } from '../../errors';
import { GraphQLError } from 'graphql-compose/lib/graphql';

/**
 * This helper add `error` field in payload & wraps `resolve` method.
 * It catches exception and return it in payload if user
 * requested `err` field in GraphQL-query.
 */
export function addErrorCatcherField(resolver: Resolver<any, any, any>): void {
  getErrorInterface(resolver.schemaComposer);

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
    try {
      const res = await childResolve(rp);
      return res;
    } catch (e) {
      let error;
      if (e instanceof ValidationError) {
        error = {
          name: 'ValidationError',
          message: e.message,
          errors: e.errors,
        };
      } else if (e?.constructor.name === 'MongoError') {
        error = {
          name: 'MongoError',
          message: e.message,
          code: e.code,
        };
      } else {
        error = {
          message: e.message,
        };
      }

      if (rp.projection?.error) {
        // User requested to return error in mutation payload.error field.
        // So do not throw error, just return it.
        return { error };
      } else {
        // Rethrow GraphQLError helps to provide `extensions` data for Error record
        // in the top-level array of errors.
        // Delete `error.message` from `extensions`, because it already present on one level upper.
        delete error.message;
        throw new GraphQLError(
          e.message,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          error
        );
      }
    }
  });
}
