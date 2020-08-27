import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';

export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    (this as any).__proto__ = RuntimeError.prototype;
  }
}

export function getRuntimeErrorOTC(schemaComposer: SchemaComposer<any>): ObjectTypeComposer {
  return schemaComposer.getOrCreateOTC('RuntimeError', (otc) => {
    otc.addFields({
      message: {
        description: 'Runtime error message',
        type: 'String',
      },
    });
  });
}
