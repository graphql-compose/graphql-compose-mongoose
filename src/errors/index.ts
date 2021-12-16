import { graphqlVersion, InterfaceTypeComposer, SchemaComposer } from 'graphql-compose';
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

    let ValidationErrorType: any;
    let MongoErrorType: any;
    let RuntimeErrorType: any;
    if (graphqlVersion >= 16) {
      ValidationErrorType = ValidationErrorOTC.getTypeName();
      MongoErrorType = MongoErrorOTC.getTypeName();
      RuntimeErrorType = RuntimeErrorOTC.getTypeName();
    } else {
      ValidationErrorType = ValidationErrorOTC.getType();
      MongoErrorType = MongoErrorOTC.getType();
      RuntimeErrorType = RuntimeErrorOTC.getType();
    }

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
