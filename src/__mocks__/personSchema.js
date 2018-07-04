import { Schema } from 'mongoose';

export const PersonSchema = new Schema({
  dob: Number,
  starShips: [ String ],
  totalCredits: Number,
});
