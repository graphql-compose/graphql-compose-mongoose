import type { Schema as SchemaType, Document } from 'mongoose';
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

export interface IPost extends Document {
  title: string;
}

const PostModel = mongoose.model<IPost>('Post', PostSchema);

export { PostSchema, PostModel };
