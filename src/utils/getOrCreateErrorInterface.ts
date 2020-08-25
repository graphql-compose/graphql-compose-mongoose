import type { ObjectTypeComposer, InterfaceTypeComposer, SchemaComposer } from 'graphql-compose';

export function getOrCreateErrorInterface(
  schemaComposer: SchemaComposer<any>
): InterfaceTypeComposer {
  const errorInterface: InterfaceTypeComposer = schemaComposer.getOrCreateIFTC(
    'ErrorInterface',
    (iftc: InterfaceTypeComposer) => {
      iftc.addFields({
        message: {
          description: 'Generic error message',
          type: 'String',
        },
      });
    }
  );

  const validationErrorOTC: ObjectTypeComposer = schemaComposer.getOrCreateOTC(
    'ValidationError',
    (otc: ObjectTypeComposer) => {
      otc.addFields({
        message: {
          description: 'Validation error message',
          type: 'String',
        },
        path: {
          description: 'Source of the validation error from the model path',
          type: 'String',
        },
        value: {
          description: 'Field value which occurs the validation error',
          type: 'JSON',
        },
      });
      otc.addInterface(errorInterface);
    }
  );
  schemaComposer.addSchemaMustHaveType(validationErrorOTC);

  const runtimeErrorOTC: ObjectTypeComposer = schemaComposer.getOrCreateOTC(
    'RuntimeError',
    (otc: ObjectTypeComposer) => {
      otc.addFields({
        message: {
          description: 'Runtime error message',
          type: 'String',
        },
      });
      otc.addInterface(errorInterface);
    }
  );
  schemaComposer.addSchemaMustHaveType(runtimeErrorOTC);

  const mongoErrorOTC: ObjectTypeComposer = schemaComposer.getOrCreateOTC(
    'MongoError',
    (otc: ObjectTypeComposer) => {
      otc.addFields({
        message: {
          description: 'MongoDB error message',
          type: 'String',
        },
        code: {
          description: 'MongoDB error code',
          type: 'String',
        },
      });
      otc.addInterface(errorInterface);
    }
  );
  schemaComposer.addSchemaMustHaveType(mongoErrorOTC);

  const resolveType = (value: any) => {
    if (value) {
      if (value.path) return 'ValidationError';
      else if (value.code) return 'MongoError';
      else return 'RuntimeError';
    }
    return null;
  };

  errorInterface.setResolveType(resolveType);

  return errorInterface;
}
