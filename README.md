# graphql-compose-mongoose

[![travis build](https://img.shields.io/travis/nodkz/graphql-compose-mongoose.svg)](https://travis-ci.org/nodkz/graphql-compose-mongoose)
[![codecov coverage](https://img.shields.io/codecov/c/github/nodkz/graphql-compose-mongoose.svg)](https://codecov.io/github/nodkz/graphql-compose-mongoose)
[![](https://img.shields.io/npm/v/graphql-compose-mongoose.svg)](https://www.npmjs.com/package/graphql-compose-mongoose)
[![npm](https://img.shields.io/npm/dt/graphql-compose-mongoose.svg)](https://www.npmjs.com/package/graphql-compose-mongoose)
[![Join the chat at https://gitter.im/graphql-compose/Lobby](https://badges.gitter.im/nodkz/graphql-compose.svg)](https://gitter.im/graphql-compose/Lobby)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)


This is a plugin for [graphql-compose](https://github.com/nodkz/graphql-compose), which derives GraphQLType from your [mongoose model](https://github.com/Automattic/mongoose). Also derives bunch of internal GraphQL Types. Provide all CRUD resolvers, including `graphql connection`, also provided basic search via operators ($lt, $gt and so on).

Installation
============
```
npm install graphql graphql-compose graphql-compose-connection mongoose graphql-compose-mongoose --save
```
Modules `graphql`, `graphql-compose`, `graphql-compose-connection`, `mongoose` are in `peerDependencies`, so should be installed explicitly in your app. They have global objects and should not have ability to be installed as submodule.

Example
=======
Live demo: [https://graphql-compose.herokuapp.com/](https://graphql-compose.herokuapp.com/)

Source code: https://github.com/nodkz/graphql-compose-mongoose-example

```js
import mongoose from 'mongoose';
import composeWithMongoose from 'graphql-compose-mongoose';
import { GQC } from 'graphql-compose';

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
  someMixed: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Can be any mixed type, that will be treated as JSON GraphQL Scalar Type',
  },
});
const UserModel = mongoose.model('UserModel', UserSchema);



// STEP 2: CONVERT MONGOOSE MODEL TO GraphQL PIECES
const customizationOptions = {}; // left it empty for simplicity, described below
const UserTC = composeWithMongoose(UserModel, customizationOptions);

// STEP 3: CREATE CRAZY GraphQL SCHEMA WITH ALL CRUD USER OPERATIONS
// via graphql-compose it will be much much easier, with less typing
GQC.rootQuery().addFields({
  userById: UserTC.getResolver('findById'),
  userByIds: UserTC.getResolver('findByIds'),
  userOne: UserTC.getResolver('findOne'),
  userMany: UserTC.getResolver('findMany'),
  userTotal: UserTC.getResolver('count'),
  userConnection: UserTC.getResolver('connection'),
});

GQC.rootMutation().addFields({
  userCreate: UserTC.getResolver('createOne'),
  userUpdateById: UserTC.getResolver('updateById'),
  userUpdateOne: UserTC.getResolver('updateOne'),
  userUpdateMany: UserTC.getResolver('updateMany'),
  userRemoveById: UserTC.getResolver('removeById'),
  userRemoveOne: UserTC.getResolver('removeOne'),
  userRemoveMany: UserTC.getResolver('removeMany'),
});

const graphqlSchema = GQC.buildSchema();
export default graphqlSchema;
```
That's all!
You think that is to much code?
I don't think so, because by default internally was created about 55 graphql types (for input, sorting, filtering). So you will need much much more lines of code to implement all these CRUD operations by hands.


Customization options
=====================
When we convert model `const UserTC = composeWithMongoose(UserModel, customizationOptions);` you may tune every piece of future derived types and resolvers.

### Here is flow typed definition of this options:

The top level of customization options. Here you setup name and description for the main type, remove fields or leave only desired fields.
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
If you set the option to `false` it will disable resolver or some of its input args.
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
    record?: recordHelperArgsOpts | false,
  },
  updateOne?: false | {
    record?: recordHelperArgsOpts | false,
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    skip?: false,
  },
  updateMany?: false | {
    record?: recordHelperArgsOpts | false,
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
    record?: recordHelperArgsOpts | false,
  },
  count?: false | {
    filter?: filterHelperArgsOpts | false,
  },
  connection?: false | {
    uniqueFields: string[],
    sortValue: mixed,
    directionFilter: (<T>(filterArg: T, cursorData: CursorDataType, isBefore: boolean) => T),
  };
};
```

This is `opts.resolvers.[resolverName].[filter|sort|record|limit]` level of options.
You may tune every resolver's args independently as you wish.
Here you may setup every argument and override some fields from the default input object type, described above in `opts.inputType`.
```js
export type filterHelperArgsOpts = {
  filterTypeName?: string, // type name for `filter`
  isRequired?: boolean, // set `filter` arg as required (wraps in GraphQLNonNull)
  onlyIndexed?: boolean, // leave only that fields, which is indexed in mongodb
  requiredFields?: string | string[], // provide fieldNames, that should be required
  operators?: filterOperatorsOpts | false, // provide filtering fields by operators, eg. $lt, $gt
};

// supported operators names in filter `arg`
export type filterOperatorNames =  'gt' | 'gte' | 'lt' | 'lte' | 'ne' | 'in[]' | 'nin[]';
export type filterOperatorsOpts = { [fieldName: string]: filterOperatorNames[] | false };

export type sortHelperArgsOpts = {
  sortTypeName?: string, // type name for `sort`
};

export type recordHelperArgsOpts = {
  recordTypeName?: string, // type name for `record`
  isRequired?: boolean, // set `record` arg as required (wraps in GraphQLNonNull)
  removeFields?: string[], // provide fieldNames, that should be removed
  requiredFields?: string[], // provide fieldNames, that should be required
};

export type limitHelperArgsOpts = {
  defaultValue?: number, // set your default limit, if it not provided in query (default: 1000)
};
```

Used plugins
============
### [graphql-compose-connection](https://github.com/nodkz/graphql-compose-connection)
This plugin adds `connection` resolver. Build in mechanism allows sort by any unique indexes (not only by id). Also supported compound sorting (by several fields).

Besides standard connection arguments `first`, `last`, `before` and `after`, also added great arguments:
* `filter` arg - for filtering records
* `sort` arg - for sorting records

This plugin completely follows to [Relay Cursor Connections Specification](https://facebook.github.io/relay/graphql/connections.htm).

TODO
====
- [ ] for `filter._operators` arg add support for $regexp

[CHANGELOG](https://github.com/nodkz/graphql-compose-mongoose/blob/master/CHANGELOG.md)

License
=======
[MIT](https://github.com/nodkz/graphql-compose-mongoose/blob/master/LICENSE.md)
