/* @flow */

import { Schema } from './mongooseCommon';

export const DroidSchema = new Schema({
  makeDate: Date,
  modelNumber: Number,
  primaryFunction: [String],
});
