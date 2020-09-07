import { schemaComposer, graphql } from 'graphql-compose';
import { composeWithMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
});
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  authorId: { type: mongoose.Types.ObjectId },
  reviewerIds: { type: [mongoose.Types.ObjectId] },
});

const UserModel = mongoose.model('User', UserSchema);
const PostModel = mongoose.model('Post', PostSchema);

const UserTC = composeWithMongoose(UserModel);
const PostTC = composeWithMongoose(PostModel);

PostTC.addRelation('author', {
  // resolver: UserTC.getResolver('dataLoader'), // <---- DataLoader for getting one mongoose doc by id (slower than `dataLoaderLean` but more functional)
  resolver: UserTC.getResolver('dataLoaderLean'), // <---- `Lean` loads record from DB without support of mongoose getters & virtuals
  prepareArgs: {
    _id: (s) => s.authorId,
  },
  projection: { authorId: true },
});

PostTC.addRelation('reviewers', {
  // resolver: UserTC.getResolver('dataLoaderMany'), // <---- DataLoader for getting many mongoose docs by ids (slower than `dataLoaderManyLean` but more functional)
  resolver: UserTC.getResolver('dataLoaderManyLean'), // <---- `Lean` loads records from DB without support of mongoose getters & virtuals
  prepareArgs: {
    _ids: (s) => s.reviewerIds,
  },
  projection: { reviewerIds: true },
});

schemaComposer.Query.addFields({
  posts: PostTC.getResolver('findMany'),
});
const schema = schemaComposer.buildSchema();

// console.log(schemaComposer.toSDL());

beforeAll(async () => {
  await UserModel.base.createConnection();
  const User1 = await UserModel.create({ name: 'User1' });
  const User2 = await UserModel.create({ name: 'User2' });
  const User3 = await UserModel.create({ name: 'User3' });

  await PostModel.create({ title: 'Post1', authorId: User1._id });
  await PostModel.create({ title: 'Post2', authorId: User1._id, reviewerIds: [] });
  await PostModel.create({ title: 'Post3', authorId: User1._id, reviewerIds: [User2._id] });
  await PostModel.create({ title: 'Post4', authorId: User2._id, reviewerIds: [User1._id] });
  await PostModel.create({ title: 'Post5', authorId: User2._id, reviewerIds: [User1._id] });
  await PostModel.create({
    title: 'Post6',
    authorId: User3._id,
    reviewerIds: [User1._id, User2._id],
  });
});
afterAll(() => UserModel.base.disconnect());

describe('issue #260 - new resolvers which works via DataLoader', () => {
  it('check response', async () => {
    // 👀 uncomment next line if you want to see real mongoose queries
    // mongoose.set('debug', true);

    expect(
      await graphql.graphql({
        schema,
        source: `query {
          posts {
            title
            author { name }
            reviewers { name }
          }
        }`,
        contextValue: {},
      })
    ).toEqual({
      data: {
        posts: [
          { title: 'Post1', author: { name: 'User1' }, reviewers: [] },
          { title: 'Post2', author: { name: 'User1' }, reviewers: [] },
          { title: 'Post3', author: { name: 'User1' }, reviewers: [{ name: 'User2' }] },
          { title: 'Post4', author: { name: 'User2' }, reviewers: [{ name: 'User1' }] },
          { title: 'Post5', author: { name: 'User2' }, reviewers: [{ name: 'User1' }] },
          {
            title: 'Post6',
            author: { name: 'User3' },
            reviewers: [{ name: 'User1' }, { name: 'User2' }],
          },
        ],
      },
    });
  });
});