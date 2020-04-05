import { model, Schema } from 'mongoose';
import { composeWithMongoose } from '../../composeWithMongoose';
import { FindManyArgs } from '../..';
import { Context, IPost, IUser, IUserModel } from './mock-typedefs';

const UserModel = model<IUser, IUserModel>('User', new Schema({}));
const PostModel = model('Post', new Schema({}));

const UserTC = composeWithMongoose<IUser, Context>(UserModel);

// if one doesn't pass `any` as source, then we will eventually get `Document`
// as source which to an extend is not as open as `any`.
// the `Document` type was set internally by mongoose typedefs.
const PostTC = composeWithMongoose<any>(PostModel);

UserTC.addFields({
  newField: {
    // test Thunk
    type: 'Int',
    resolve: (source, args, context) => {
      source.name = 'GQC';
      // source.name = 44;
      context.auth = 'auth';
      // context.auth = 44;
    },
  },
});

PostTC.addFields({
  newField: {
    // test Thunk
    type: 'Int',
    resolve: (source, args, context) => {
      source.name = 'GQC';
      source.name = 44;
      context.auth = 'auth';
      context.auth = 44;
    },
  },
});

PostTC.getResolver('findMany').wrapResolve<any, FindManyArgs<IPost>>((next) => (rp) => {
  if (rp.source && rp.args) {
    rp.args.limit = 50;
    // fix this to display only Post fields.
    // Avoid Document fields
    rp.args.filter.title = 'New Title';
    // rp.args.filter.title = 5;
    // rp.args.limit = 'limit';
  }
});
