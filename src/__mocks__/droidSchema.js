import { Schema } from 'mongoose';

export const DroidSchema = new Schema({
  makeDate: Date,
  modelNumber: Number,
  primaryFunction: [String],
});
