/* @flow */

import { Schema } from './mongooseCommon';

export const PersonSchema = new Schema({
  dob: Number,
  starShips: [String],
  totalCredits: Number,
});
