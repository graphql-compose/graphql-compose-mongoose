/* @flow */

import { Schema } from '../../__mocks__/mongooseCommon';

export const DroidSchema = new Schema({
  makeDate: Date,
  modelNumber: Number,
  primaryFunction: [String],
});
