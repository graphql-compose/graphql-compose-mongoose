/* @flow */

import { Schema } from '../../__mocks__/mongooseCommon';

export const PersonSchema = new Schema({
  dob: Number,
  starShips: [String],
  totalCredits: Number,
});
