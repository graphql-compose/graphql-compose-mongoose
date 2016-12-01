import { mongoose, Schema } from './mongooseCommon';

const PostSchema = new Schema(
  {
    _id: {
      type: Number,
      unique: true,
    },
    title: {
      type: String,
      description: 'Post title',
    },

    // createdAt, created via option `timastamp: true` (see bottom)
    // updatedAt, created via option `timastamp: true` (see bottom)
  }
);

const PostModel = mongoose.model('Post', PostSchema);

export {
  PostSchema,
  PostModel,
};
