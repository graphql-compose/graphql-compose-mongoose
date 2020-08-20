import type { ObjectTypeComposer } from 'graphql-compose';

export function getOrCreateErrorPayload(tc: ObjectTypeComposer) {
  return tc.schemaComposer.getOrCreateOTC('ErrorPayload', (t) => {
    t.addFields({
      path: {
        type: 'String',
        description: 'Source of error, typically a model validation path',
      },
      messages: {
        type: '[String]',
        description: 'Error messages',
      },
    });
  });
}
