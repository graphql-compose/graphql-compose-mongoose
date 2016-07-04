graphql-compose-mongoose
======================
This is a plugin for [graphql-compose](https://github.com/nodkz/graphql-compose), which derives a bunch of GraphQL types and resolvers from mongoose models.

Example
=======
Live demo: [https://graphql-compose-mongoose.herokuapp.com/](https://graphql-compose-mongoose.herokuapp.com/?query=%7B%0A%20%20userMany(limit%3A%205)%20%7B%0A%20%20%20%20_id%0A%20%20%20%20name%0A%20%20%20%20age%0A%20%20%7D%0A%7D)

Source code: https://github.com/nodkz/graphql-compose-mongoose-example

```js
import mongoose from 'mongoose';
import mongooseToTypeComposer from 'graphql-compose-mongoose';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';

// STEP 1: DEFINE MONGOOSE SCHEMA AND MODEL
const LanguagesSchema = new mongoose.Schema({
  language: String,
  skill: {
    type: String,
    enum: [ 'basic', 'fluent', 'native' ],
  },
});

const UserSchema = new mongoose.Schema({
  name: String, // standard types
  age: {
    type: Number,
    index: true,
  },
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



// STEP 2: CONVERT MONGOOSE MODEL TO GraphQL PIECES
const customizationOptions = {}; // left it empty for simplicity
const typeComposer = mongooseToTypeComposer(UserModel, customizationOptions);
// get list of 12 Resolvers (findById, updateMany and others)
const resolvers = typeComposer.getResolvers();

// typeComposer from (graphql-compose) provide bunch if useful methods
// for modifying GraphQL Types (eg. add/remove fields, relate with other types,
// restrict access due context).


// STEP 3: CREATE CRAZY GraphQL SCHEMA WITH ALL CRUD USER OPERATIONS
// via graphql-compose it will be much much easier, with less typing
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

export default graphqlSchema;
```
That's all!
You think that is to much code?
I don't think so, because by default internally was created about 30 graphql types (for input, sorting, filtering). So you will need much-much more lines of code to implement all this CRUD operations by hands.


Customization options
=====================
When we convert model `const typeComposer = mongooseToTypeComposer(UserModel, customizationOptions);` you may tune every piece of future derived types and resolvers.

### Here is flow typed definition of this options:

This is top level of customization options. Here you setup name and description for main type, remove fields or leave only desired fields from mongoose model.
```js
export type typeConverterOpts = {
  name?: string,
  description?: string,
  fields?: {
    only?: string[],
    remove?: string[],
  },
  inputType?: typeConverterInputTypeOpts,
  resolvers?: false | typeConverterResolversOpts,
};
```

This is `opts.inputType` level of options for default InputTypeObject which will be provided to all resolvers for `filter` and `input` args.
```js
export type typeConverterInputTypeOpts = {
  name?: string,
  description?: string,
  fields?: {
    only?: string[],
    remove?: string[],
    required?: string[]
  },
};
```

This is `opts.resolvers` level of options.
If you set option to `false` it will disable resolver or some of its input args.
Every resolver's arg has it own options. They described below.
```js
export type typeConverterResolversOpts = {
  findById?: false,
  findByIds?: false | {
    limit?: limitHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
  },
  findOne?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    skip?: false,
  },
  findMany?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    limit?: limitHelperArgsOpts | false,
    skip?: false,
  },
  updateById?: false | {
    input?: inputHelperArgsOpts | false,
  },
  updateOne?: false | {
    input?: inputHelperArgsOpts | false,
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    skip?: false,
  },
  updateMany?: false | {
    input?: inputHelperArgsOpts | false,
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    limit?: limitHelperArgsOpts | false,
    skip?: false,
  },
  removeById?: false,
  removeOne?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
  },
  removeMany?: false | {
    filter?: filterHelperArgsOpts | false,
  },
  createOne?: false | {
    input?: inputHelperArgsOpts | false,
  },
  count?: false | {
    filter?: filterHelperArgsOpts | false,
  },
};
```

This is `opts.resolvers.[resolverName].[filter|sort|input|limit]` level of options.
You may tune every resolver's args independently as you wish.
Here you may setup every argument and override some fields from the default input object type, described above in `opts.inputType`.
```js
export type filterHelperArgsOpts = {
  filterTypeName?: string, // type name for `filter`
  isRequired?: boolean, // set `filter` arg as required (wraps in GraphQLNonNull)
  onlyIndexed?: boolean, // leave only that fields, which is indexed in mongodb
  requiredFields?: string | string[], // provide fieldNames, that should be required
};

export type sortHelperArgsOpts = {
  sortTypeName?: string, // type name for `sort`
};

export type inputHelperArgsOpts = {
  inputTypeName?: string, // type name for `input`
  isRequired?: boolean, // set `input` arg as required (wraps in GraphQLNonNull)
  removeFields?: string[], // provide fieldNames, that should be removed
  requiredFields?: string[], // provide fieldNames, that should be required
};

export type limitHelperArgsOpts = {
  defaultValue?: number, // set your default limit, if it not provided in query (default: 1000)
};
```

What's next?
============
Read about [graphql-compose](https://github.com/nodkz/graphql-compose).
This module in near future allow to combine any complexity of your GraphQL schema.
- From different data-sources, eg. `Mongoose`, `Sequelize`, some RESTfull APIs.
- Restrict access to fields due context.
- Wraps any resolver with additional business logic.
- Relate different type with each other (build graph).
- Prepare schemas for `Relay` (adds clientMutationId, node interface, generate global ids)
- Add caching via `DataLoader`
- Add supporting of GraphQL Connection Type
- And may be using graphql on server side for API calls to different services (have such amazing thoughts ;).
- and much much more

## SO, THE FUTURE OF CRAZY GRAPHQL SCHEMAS IS NOT SO FAR


TODO
====
- [ ] for `filter` arg add support for $lt, $gt and other selector's operators

[CHANGELOG](https://github.com/nodkz/graphql-compose-mongoose/blob/master/CHANGELOG.md)

License
=======
[MIT](https://github.com/nodkz/graphql-compose-mongoose/blob/master/LICENSE.md)
