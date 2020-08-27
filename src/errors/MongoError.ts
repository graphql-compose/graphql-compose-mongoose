import { MongoError } from 'mongodb';
import { SchemaComposer, ObjectTypeComposer } from 'graphql-compose';

export { MongoError };

export function getMongoErrorOTC(schemaComposer: SchemaComposer<any>): ObjectTypeComposer {
  return schemaComposer.getOrCreateOTC('MongoError', (otc) => {
    otc.addFields({
      message: {
        description: 'MongoDB error message',
        type: 'String',
      },
      code: {
        description: 'MongoDB error code',
        type: 'Int',
      },
    });
  });
}
