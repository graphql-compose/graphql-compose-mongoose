import { patchMongooseSchemaIndex } from './utils/patchMongoose';
import { beforeAll } from '@jest/globals';

beforeAll(() => {
  patchMongooseSchemaIndex();
});
