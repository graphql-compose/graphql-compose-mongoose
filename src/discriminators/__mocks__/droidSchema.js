/* @flow */

import type { Schema as SchemaType } from 'mongoose';
import { Schema } from '../../__mocks__/mongooseCommon';

export const DroidSchema: SchemaType<any> = new Schema({
  makeDate: Date,
  modelNumber: Number,
  primaryFunction: [String],
});
