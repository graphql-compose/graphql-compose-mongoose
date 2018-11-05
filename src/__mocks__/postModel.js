/* @flow */

import type { Schema as SchemaType } from 'mongoose';
import { mongoose, Schema } from './mongooseCommon';

const PostSchema: SchemaType<any> = new Schema({
  _id: {
    type: Number,
  },
  title: {
    type: String,
    description: 'Post title',
  },

  // createdAt, created via option `timastamp: true` (see bottom)
  // updatedAt, created via option `timastamp: true` (see bottom)
});

const PostModel = mongoose.model('Post', PostSchema);

export { PostSchema, PostModel };
