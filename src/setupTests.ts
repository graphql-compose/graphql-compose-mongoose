import { patchMongooseSchemaIndex } from './utils/patchMongoose';

global.beforeAll(() => {
  patchMongooseSchemaIndex();
});
