import type { InterfaceTypeComposer, SchemaComposer } from 'graphql-compose';
import { getMongoErrorOTC } from './MongoError';
import { ValidationError, getValidationErrorOTC } from './ValidationError';
import { RuntimeError, getRuntimeErrorOTC } from './RuntimeError';

export { ValidationError, RuntimeError };

export function getErrorInterface(schemaComposer: SchemaComposer<any>): InterfaceTypeComposer {
  const ErrorInterface = schemaComposer.getOrCreateIFTC('ErrorInterface', (iftc) => {
    iftc.addFields({
      message: {
        description: 'Generic error message',
        type: 'String',
      },
    });

    const ValidationErrorOTC = getValidationErrorOTC(schemaComposer);
    const MongoErrorOTC = getMongoErrorOTC(schemaComposer);
    const RuntimeErrorOTC = getRuntimeErrorOTC(schemaComposer);

    ValidationErrorOTC.addInterface(iftc);
    MongoErrorOTC.addInterface(iftc);
    RuntimeErrorOTC.addInterface(iftc);

    schemaComposer.addSchemaMustHaveType(ValidationErrorOTC);
    schemaComposer.addSchemaMustHaveType(MongoErrorOTC);
    schemaComposer.addSchemaMustHaveType(RuntimeErrorOTC);

    const ValidationErrorType = ValidationErrorOTC.getType();
    const MongoErrorType = MongoErrorOTC.getType();
    const RuntimeErrorType = RuntimeErrorOTC.getType();

    iftc.setResolveType((value) => {
      switch (value?.name) {
        case 'ValidationError':
          return ValidationErrorType;
        case 'MongoError':
          return MongoErrorType;
        default:
          return RuntimeErrorType;
      }
    });
  });

  return ErrorInterface;
}
