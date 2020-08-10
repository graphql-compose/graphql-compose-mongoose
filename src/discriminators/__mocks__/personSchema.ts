import type { Schema as SchemaType } from 'mongoose';
import { Schema } from '../../__mocks__/mongooseCommon';

export const PersonSchema: SchemaType<any> = new Schema({
  dob: Number,
  starShips: [String],
  totalCredits: Number,
});
