graphql-compose-mongoose
======================
This is a plugin for [graphql-compose](https://github.com/nodkz/graphql-compose), which derives a bunch of GraphQL types and resolvers from mongoose models.

Example
=======

```js
import { Schema } from 'mongoose';
import mongooseToTypeComposer from 'graphql-compose-mongoose';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';

// STEP 1: DEFINE MONGOOSE SCHEMA AND MODEL
const LanguagesSchema = new Schema({
  language: String,
  skill: {
    type: String,
    enum: [ 'basic', 'fluent', 'native' ],
  },
});

const UserSchema = new Schema({
  name: String, // standard types
  age: {
    type: Number,
    index: true,
  }
  languages: {
    type: [LanguagesSchema], // you may include other schemas (here included as array of embedded documents)
    default: [],
  },
  contacts: { // another mongoose way for providing embedded documents
    email: String,
    phones: [String], // array of strings
  },
  gender: { // enum field with values
    type: String,
    enum: ['male', 'female', 'ladyboy'],
  },
});
const UserModel = mongoose.model('UserModel', UserSchema);
export default UserModel;



// STEP 2: CONVERT MONGOOSE MODEL TO GraphQL PIECES
const typeComposer = mongooseToTypeComposer(UserModel);
// get list of 12 Resolvers (findById, updateMany and others)
const resolvers = typeComposer.getResolvers();

// typeComposer from (graphql-compose) provide bunch if useful methods
// for modifying GraphQL Types (eg. add/remove fields, relate with other types)



// STEP 3: CREATE CRAZY GraphQL SCHEMA WITH ALL CRUD USER OPERATIONS
const graphqlSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
      userById: resolvers.get('findById').getFieldConfig(),
      userByIds: resolvers.get('findByIds').getFieldConfig(),
      userOne: resolvers.get('findOne').getFieldConfig(),
      userMany: resolvers.get('findMany').getFieldConfig(),
      userTotal: resolvers.get('count').getFieldConfig(),
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'RootMutation',
    fields: {
      userCreate: resolvers.get('createOne').getFieldConfig(),
      userUpdateById: resolvers.get('updateById').getFieldConfig(),
      userUpdateOne: resolvers.get('updateOne').getFieldConfig(),
      userUpdateMany: resolvers.get('updateMany').getFieldConfig(),
      userRemoveById: resolvers.get('removeById').getFieldConfig(),
      userRemoveOne: resolvers.get('removeOne').getFieldConfig(),
      userRemoveMany: resolvers.get('removeMany').getFieldConfig(),
    },
  }),
});
```

mongooseToTypeComposer options
==============================
will be described


TODO
====
- [ ] for `filter` arg add support for $lt, $gt and other selector's operators

[CHANGELOG](https://github.com/nodkz/graphql-compose-mongoose/blob/master/CHANGELOG.md)

License
=======
[MIT](https://github.com/nodkz/graphql-compose-mongoose/blob/master/LICENSE.md)
