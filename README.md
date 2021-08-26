# graphql-compose-mongoose

[![travis build](https://img.shields.io/travis/graphql-compose/graphql-compose-mongoose.svg)](https://travis-ci.org/graphql-compose/graphql-compose-mongoose)
[![codecov coverage](https://img.shields.io/codecov/c/github/graphql-compose/graphql-compose-mongoose.svg)](https://codecov.io/github/graphql-compose/graphql-compose-mongoose)
[![npm](https://img.shields.io/npm/v/graphql-compose-mongoose.svg)](https://www.npmjs.com/package/graphql-compose-mongoose)
[![trends](https://img.shields.io/npm/dt/graphql-compose-mongoose.svg)](http://www.npmtrends.com/graphql-compose-mongoose)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Backers on Open Collective](https://opencollective.com/graphql-compose/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/graphql-compose/sponsors/badge.svg)](#sponsors)

This is a plugin for [graphql-compose](https://github.com/graphql-compose/graphql-compose), which derives GraphQLType from your [mongoose model](https://github.com/Automattic/mongoose). Also derives bunch of internal GraphQL Types. Provide all CRUD resolvers, including `graphql connection`, also provided basic search via operators ($lt, $gt and so on).

[Release Notes for v9.0.0](https://github.com/graphql-compose/graphql-compose-mongoose/blob/alpha/docs/releases/9.0.0.md) contains a lot of improvements. It's strongly recommended for reading before upgrading from v8.

<!-- TOC depthFrom:2 -->

- [Installation](#installation)
- [Intro video](#intro-video)
- [Example](#example)
  - [Working with Mongoose Collection Level Discriminators](#working-with-mongoose-collection-level-discriminators)
- [Customization options](#customization-options)
  - [`composeMongoose` customization options](#composemongoose-customization-options)
- [Resolvers' customization options](#resolvers-customization-options)
  - [`connection(opts?: ConnectionResolverOpts)`](#connectionopts-connectionresolveropts)
  - [`count(opts?: CountResolverOpts)`](#countopts-countresolveropts)
  - [`createMany(opts?: CreateManyResolverOpts)`](#createmanyopts-createmanyresolveropts)
  - [`createOne(opts?: CreateOneResolverOpts)`](#createoneopts-createoneresolveropts)
  - [`dataLoader(opts?: DataLoaderResolverOpts)`](#dataloaderopts-dataloaderresolveropts)
  - [`dataLoaderMany(opts?: DataLoaderManyResolverOpts)`](#dataloadermanyopts-dataloadermanyresolveropts)
  - [`findById(opts?: FindByIdResolverOpts)`](#findbyidopts-findbyidresolveropts)
  - [`findByIds(opts?: FindByIdsResolverOpts)`](#findbyidsopts-findbyidsresolveropts)
  - [`findMany(opts?: FindManyResolverOpts)`](#findmanyopts-findmanyresolveropts)
  - [`findOne(opts?: FindOneResolverOpts)`](#findoneopts-findoneresolveropts)
  - [`pagination(opts?: PaginationResolverOpts)`](#paginationopts-paginationresolveropts)
  - [`removeById(opts?: RemoveByIdResolverOpts)`](#removebyidopts-removebyidresolveropts)
  - [`removeMany(opts?: RemoveManyResolverOpts)`](#removemanyopts-removemanyresolveropts)
  - [`removeOne(opts?: RemoveOneResolverOpts)`](#removeoneopts-removeoneresolveropts)
  - [`updateById(opts?: UpdateByIdResolverOpts)`](#updatebyidopts-updatebyidresolveropts)
  - [`updateMany(opts?: UpdateManyResolverOpts)`](#updatemanyopts-updatemanyresolveropts)
  - [`updateOne(opts?: UpdateOneResolverOpts)`](#updateoneopts-updateoneresolveropts)
  - [Description of common resolvers' options](#description-of-common-resolvers-options)
    - [`FilterHelperArgsOpts`](#filterhelperargsopts)
    - [`SortHelperArgsOpts`](#sorthelperargsopts)
    - [`RecordHelperArgsOpts`](#recordhelperargsopts)
    - [`LimitHelperArgsOpts`](#limithelperargsopts)
- [FAQ](#faq)
  - [Can I get generated vanilla GraphQL types?](#can-i-get-generated-vanilla-graphql-types)
  - [How to add custom fields?](#how-to-add-custom-fields)
  - [How to build nesting/relations?](#how-to-build-nestingrelations)
  - [Reusing the same mongoose Schema in embedded object fields](#reusing-the-same-mongoose-schema-in-embedded-object-fields)
  - [Access and modify mongoose doc before save](#access-and-modify-mongoose-doc-before-save)
  - [How can I restrict access to certain fields or documents?](#how-can-i-restrict-access-to-certain-fields-or-documents)
  - [How can I push/pop or add/remove values to arrays?](#how-can-i-pushpop-or-addremove-values-to-arrays)
  - [Is it possible to use several schemas?](#is-it-possible-to-use-several-schemas)
  - [Embedded documents has `_id` field and you don't need it?](#embedded-documents-has-_id-field-and-you-dont-need-it)
  - [Can field name in schema have different name in database?](#can-field-name-in-schema-have-different-name-in-database)
- [Backers](#backers)
- [Sponsors](#sponsors)
- [License](#license)

<!-- /TOC -->

## Installation

```bash
npm install graphql graphql-compose mongoose graphql-compose-mongoose --save
```

Modules `graphql`, `graphql-compose`, `mongoose` are in `peerDependencies`, so should be installed explicitly in your app. They have global objects and should not have ability to be installed as submodule.

## Intro video

Viktor Kjartansson created a quite solid intro for `graphql-compose-mongoose` in comparison with `graphql-tools`:

<a href="https://www.youtube.com/watch?v=RXcY-OoGnQ8" target="_blank"><img src="https://img.youtube.com/vi/RXcY-OoGnQ8/0.jpg" alt="#2 Mongoose - add GraphQL with graphql-compose" style="width: 380px" />

<https://www.youtube.com/watch?v=RXcY-OoGnQ8> (23 mins)

## Example

Live demo: <https://graphql-compose.herokuapp.com/>

Source code: <https://github.com/graphql-compose/graphql-compose-examples>

Small explanation for variables naming:

- `UserSchema` - this is a mongoose schema
- `User` - this is a mongoose model
- `UserTC` - this is a `ObjectTypeComposer` instance for User. `ObjectTypeComposer` has `GraphQLObjectType` inside, available via method `UserTC.getType()`.
- Here and in all other places of code variables suffix `...TC` means that this is `ObjectTypeComposer` instance, `...ITC` - `InputTypeComposer`, `...ETC` - `EnumTypeComposer`.

```ts
import mongoose from 'mongoose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { schemaComposer } from 'graphql-compose';

// STEP 1: DEFINE MONGOOSE SCHEMA AND MODEL
const LanguagesSchema = new mongoose.Schema({
  language: String,
  skill: {
    type: String,
    enum: ['basic', 'fluent', 'native'],
  },
});

const UserSchema = new mongoose.Schema({
  name: String, // standard types
  age: {
    type: Number,
    index: true,
  },
  ln: {
    type: [LanguagesSchema], // you may include other schemas (here included as array of embedded documents)
    default: [],
    alias: 'languages', // in schema `ln` will be named as `languages`
  },
  contacts: { // another mongoose way for providing embedded documents
    email: String,
    phones: [String], // array of strings
  },
  gender: { // enum field with values
    type: String,
    enum: ['male', 'female'],
  },
  someMixed: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Can be any mixed type, that will be treated as JSON GraphQL Scalar Type',
  },
});
const User = mongoose.model('User', UserSchema);

// STEP 2: CONVERT MONGOOSE MODEL TO GraphQL PIECES
const customizationOptions = {}; // left it empty for simplicity, described below
const UserTC = composeMongoose(User, customizationOptions);

// STEP 3: ADD NEEDED CRUD USER OPERATIONS TO THE GraphQL SCHEMA
// via graphql-compose it will be much much easier, with less typing
schemaComposer.Query.addFields({
  userById: UserTC.mongooseResolvers.findById(),
  userByIds: UserTC.mongooseResolvers.findByIds(),
  userOne: UserTC.mongooseResolvers.findOne(),
  userMany: UserTC.mongooseResolvers.findMany(),
  userDataLoader: UserTC.mongooseResolvers.dataLoader(),
  userDataLoaderMany: UserTC.mongooseResolvers.dataLoaderMany(),
  userByIdLean: UserTC.mongooseResolvers.findById({ lean: true }),
  userByIdsLean: UserTC.mongooseResolvers.findByIds({ lean: true }),
  userOneLean: UserTC.mongooseResolvers.findOne({ lean: true }),
  userManyLean: UserTC.mongooseResolvers.findMany({ lean: true }),
  userDataLoaderLean: UserTC.mongooseResolvers.dataLoader({ lean: true }),
  userDataLoaderManyLean: UserTC.mongooseResolvers.dataLoaderMany({ lean: true }),
  userCount: UserTC.mongooseResolvers.count(),
  userConnection: UserTC.mongooseResolvers.connection(),
  userPagination: UserTC.mongooseResolvers.pagination(),
});

schemaComposer.Mutation.addFields({
  userCreateOne: UserTC.mongooseResolvers.createOne(),
  userCreateMany: UserTC.mongooseResolvers.createMany(),
  userUpdateById: UserTC.mongooseResolvers.updateById(),
  userUpdateOne: UserTC.mongooseResolvers.updateOne(),
  userUpdateMany: UserTC.mongooseResolvers.updateMany(),
  userRemoveById: UserTC.mongooseResolvers.removeById(),
  userRemoveOne: UserTC.mongooseResolvers.removeOne(),
  userRemoveMany: UserTC.mongooseResolvers.removeMany(),
});

// STEP 4: BUILD GraphQL SCHEMA OBJECT
const schema = schemaComposer.buildSchema();
export default schema;

// STEP 5: DEMO USE OF GraphQL SCHEMA OBJECT
// Just a demo, normally you'd pass schema object to server such as Apollo server.
import { graphql } from 'graphql';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/test');
  await mongoose.connection.dropDatabase();

  await User.create({ name: 'alice', age: 29, gender: 'female' });
  await User.create({ name: 'maria', age: 31, gender: 'female' });
  const bob = await User.create({ name: 'bob', age: 30, gender: 'male' });

  const response1 = await graphql({
    schema,
    source: 'query { userMany { _id name } }',
  });
  console.dir(response1, { depth: 5 });

  const response2 = await graphql({
    schema,
    source: 'query($id: MongoID!) { userById(_id: $id) { _id name } }',
    variableValues: { id: bob._id },
  });
  console.dir(response2, { depth: 5 });

  const response3 = await graphql({
    schema,
    source: 'mutation($id: MongoID!, $name: String) { userUpdateOne(filter: {_id: $id}, record: { name: $name }) { record { _id name } } }',
    variableValues: { id: bob._id, name: 'bill' },
  });
  console.dir(response3, { depth: 5 });

  mongoose.disconnect();
})();
```

That's all!
You think that is to much code?
I don't think so, because by default internally was created about 55 graphql types (for input, sorting, filtering). So you will need much much more lines of code to implement all these CRUD operations by hands.

### Working with Mongoose Collection Level Discriminators

Variable Namings

- `...DTC` - Suffix for a `DiscriminatorTypeComposer` instance, which is also an instance of `ObjectTypeComposer`. All fields and Relations manipulations on this instance affects all registered discriminators and the Discriminator Interface.

```ts
  import mongoose from 'mongoose';
  import { schemaComposer } from 'graphql-compose';
  import { composeMongooseDiscriminators } from 'graphql-compose-mongoose';

  // pick a discriminatorKey
  const DKey = 'type';

  const enumCharacterType = {
    PERSON: 'Person',
    DROID: 'Droid',
  };

  // DEFINE BASE SCHEMA
  const CharacterSchema = new mongoose.Schema({
    // _id: field...
    type: {
      type: String,
      required: true,
      enum: (Object.keys(enumCharacterType): Array<string>),
      description: 'Character type Droid or Person',
    },

    name: String,
    height: Number,
    mass: Number,
    films: [String],
  });

  // DEFINE DISCRIMINATOR SCHEMAS
  const DroidSchema = new mongoose.Schema({
    makeDate: String,
    primaryFunction: [String],
  });

  const PersonSchema = new mongoose.Schema({
    gender: String,
    hairColor: String,
    starships: [String],
  });

  // set discriminator Key
  CharacterSchema.set('discriminatorKey', DKey);

  // create base Model
  const CharacterModel = mongoose.model('Character', CharacterSchema);

  // create mongoose discriminator models
  const DroidModel = CharacterModel.discriminator(enumCharacterType.DROID, DroidSchema);
  const PersonModel = CharacterModel.discriminator(enumCharacterType.PERSON, PersonSchema);

  // create DiscriminatorTypeComposer
  const baseOptions = { // regular TypeConverterOptions, passed to composeMongoose
    fields: {
      remove: ['friends'],
    }
  }
  const CharacterDTC = composeMongooseDiscriminators(CharacterModel, baseOptions);

  // create Discriminator Types
  const droidTypeConverterOptions = {  // this options will be merged with baseOptions -> customizationsOptions
    fields: {
      remove: ['makeDate'],
    }
  };
  const DroidTC = CharacterDTC.discriminator(DroidModel, droidTypeConverterOptions);
  const PersonTC = CharacterDTC.discriminator(PersonModel);  // baseOptions -> customizationsOptions applied

  // You may now use CharacterDTC to add fields to all Discriminators
  // Use DroidTC, `PersonTC as any other ObjectTypeComposer.
  schemaComposer.Mutation.addFields({
    droidCreate: DroidTC.getResolver('createOne'),
    personCreate: PersonTC.getResolver('createOne'),
  });

  const schema = schemaComposer.buildSchema();

  describe('createOne', () => {
    it('should create child document without specifying DKey', async () => {
      const res = await graphql.graphql(
        schema,
        `mutation CreateCharacters {
          droidCreate(record: {name: "Queue XL", modelNumber: 360 }) {
            record {
              __typename
              type
              name
              modelNumber
            }
          }

          personCreate(record: {name: "mernxl", dob: 57275272}) {
            record {
              __typename
              type
              name
              dob
            }
          }
        }`
      );

      expect(res).toEqual({
        data: {
          droidCreate: {
            record: { __typename: 'Droid', type: 'Droid', name: 'Queue XL', modelNumber: 360 },
          },
          personCreate: {
            record: { __typename: 'Person', type: 'Person', name: 'mernxl', dob: 57275272 },
          },
        },
      });
    });
  });
```

## Customization options

### `composeMongoose` customization options

When you converting mongoose model `const UserTC = composeMongoose(User, opts: ComposeMongooseOpts);` you may tune every piece of future derived types – setup name and description for the main type, remove fields or leave only desired fields.

```ts
type ComposeMongooseOpts = {
  /**
   * Which type registry use for generated types.
   * By default is used global default registry.
   */
  schemaComposer?: SchemaComposer<TContext>;
  /**
   * What should be base type name for generated type from mongoose model.
   */
  name?: string;
  /**
   * Provide arbitrary description for generated type.
   */
  description?: string;
  /**
   * You can leave only whitelisted fields in type via this option.
   * Any other fields will be removed.
   */
  onlyFields?: string[];
  /**
   * You an remove some fields from type via this option.
   */
  removeFields?: string[];
  /**
   * You may configure generated InputType
   */
  inputType?: TypeConverterInputTypeOpts;
  /**
   * You can make fields as NonNull if they have default value in mongoose model.
   */
  defaultsAsNonNull?: boolean;
};
```

This is `opts.inputType` options for default InputTypeObject which will be provided to all resolvers for `filter` and `input` args.

```ts
type TypeConverterInputTypeOpts = {
  /**
   * What should be input type name.
   * By default: baseTypeName + 'Input'
   */
  name?: string;
  /**
   * Provide arbitrary description for generated type.
   */
  description?: string;
  /**
   * You can leave only whitelisted fields in type via this option.
   * Any other fields will be removed.
   */
  onlyFields?: string[];
  /**
   * You an remove some fields from type via this option.
   */
  removeFields?: string[];
  /**
   * This option makes provided fieldNames as required
   */
  requiredFields?: string[];
};
```

## Resolvers' customization options

When you are creating resolvers from `mongooseResolvers` factory, you may provide customizationOptions to it:

```ts
UserTC.mongooseResolvers.findMany(opts);
```

### `connection(opts?: ConnectionResolverOpts)`

```ts
type ConnectionResolverOpts<TContext = any> = {
  /** See below **/
  sort?: ConnectionSortMapOpts;
  name?: string;
  defaultLimit?: number | undefined;
  edgeTypeName?: string;
  edgeFields?: ObjectTypeComposerFieldConfigMap<any, TContext>;
  /** See below **/
  countOpts?: CountResolverOpts;
  /** See below **/
  findManyOpts?: FindManyResolverOpts;
}
```

The `countOpts` and `findManyOpts` props would be used to customize the internally created `findMany` and `count` resolver factories used by the connection resolver.
If not provided the default configuration for each of the resolver factories is assumed.

The `sort` prop is optional. When provided it is used to customize the sorting behaviour of the connection. When not provided, the sorting configuration is derived from the existing indexes on the model.

Please refer to the documentation of the [graphql-compose-connection](https://github.com/graphql-compose/graphql-compose-connection) plugin for more details on the sorting customization parameter.



### `count(opts?: CountResolverOpts)`

```ts
interface CountResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
}
```

### `createMany(opts?: CreateManyResolverOpts)`

```ts
interface CreateManyResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `records` argument. */
  records?: RecordHelperArgsOpts;
  /** Customize payload.recordIds field. If false, then this field will be removed. */
  recordIds?: PayloadRecordIdsHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}
```

### `createOne(opts?: CreateOneResolverOpts)`

```ts
interface CreateOneResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `record` argument */
  record?: RecordHelperArgsOpts;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}
```

### `dataLoader(opts?: DataLoaderResolverOpts)`

```ts
interface DataLoaderResolverOpts {
  /**
   * Enabling the lean option tells Mongoose to skip instantiating
   * a full Mongoose document and just give you the plain JavaScript objects.
   * Documents are much heavier than vanilla JavaScript objects,
   * because they have a lot of internal state for change tracking.
   * The downside of enabling lean is that lean docs don't have:
   *   Default values
   *   Getters and setters
   *   Virtuals
   * Read more about `lean`: https://mongoosejs.com/docs/tutorials/lean.html
   */
  lean?: boolean;
}
```

### `dataLoaderMany(opts?: DataLoaderManyResolverOpts)`

```ts
interface DataLoaderManyResolverOpts {
  /**
   * Enabling the lean option tells Mongoose to skip instantiating
   * a full Mongoose document and just give you the plain JavaScript objects.
   * Documents are much heavier than vanilla JavaScript objects,
   * because they have a lot of internal state for change tracking.
   * The downside of enabling lean is that lean docs don't have:
   *   Default values
   *   Getters and setters
   *   Virtuals
   * Read more about `lean`: https://mongoosejs.com/docs/tutorials/lean.html
   */
  lean?: boolean;
}
```

### `findById(opts?: FindByIdResolverOpts)`

```ts
interface FindByIdResolverOpts {
  /**
   * Enabling the lean option tells Mongoose to skip instantiating
   * a full Mongoose document and just give you the plain JavaScript objects.
   * Documents are much heavier than vanilla JavaScript objects,
   * because they have a lot of internal state for change tracking.
   * The downside of enabling lean is that lean docs don't have:
   *   Default values
   *   Getters and setters
   *   Virtuals
   * Read more about `lean`: https://mongoosejs.com/docs/tutorials/lean.html
   */
  lean?: boolean;
}
```

### `findByIds(opts?: FindByIdsResolverOpts)`

```ts
interface FindByIdsResolverOpts {
  /**
   * Enabling the lean option tells Mongoose to skip instantiating
   * a full Mongoose document and just give you the plain JavaScript objects.
   * Documents are much heavier than vanilla JavaScript objects,
   * because they have a lot of internal state for change tracking.
   * The downside of enabling lean is that lean docs don't have:
   *   Default values
   *   Getters and setters
   *   Virtuals
   * Read more about `lean`: https://mongoosejs.com/docs/tutorials/lean.html
   */
  lean?: boolean;
  limit?: LimitHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
}
```

### `findMany(opts?: FindManyResolverOpts)`

```ts
interface FindManyResolverOpts {
  /**
   * Enabling the lean option tells Mongoose to skip instantiating
   * a full Mongoose document and just give you the plain JavaScript objects.
   * Documents are much heavier than vanilla JavaScript objects,
   * because they have a lot of internal state for change tracking.
   * The downside of enabling lean is that lean docs don't have:
   *   Default values
   *   Getters and setters
   *   Virtuals
   * Read more about `lean`: https://mongoosejs.com/docs/tutorials/lean.html
   */
  lean?: boolean;
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  limit?: LimitHelperArgsOpts | false;
  skip?: false;
}
```

### `findOne(opts?: FindOneResolverOpts)`

```ts
interface FindOneResolverOpts {
  /**
   * Enabling the lean option tells Mongoose to skip instantiating
   * a full Mongoose document and just give you the plain JavaScript objects.
   * Documents are much heavier than vanilla JavaScript objects,
   * because they have a lot of internal state for change tracking.
   * The downside of enabling lean is that lean docs don't have:
   *   Default values
   *   Getters and setters
   *   Virtuals
   * Read more about `lean`: https://mongoosejs.com/docs/tutorials/lean.html
   */
  lean?: boolean;
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  skip?: false;
}
```

### `pagination(opts?: PaginationResolverOpts)`

```ts
interface PaginationResolverOpts {
  name?: string;
  perPage?: number;
  countOpts?: CountResolverOpts;
  findManyOpts?: FindManyResolverOpts;
}
```

### `removeById(opts?: RemoveByIdResolverOpts)`

```ts
interface RemoveByIdResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}
```

### `removeMany(opts?: RemoveManyResolverOpts)`

```ts
interface RemoveManyResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  limit?: LimitHelperArgsOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}
```

### `removeOne(opts?: RemoveOneResolverOpts)`

```ts
interface RemoveOneResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}
```

### `updateById(opts?: UpdateByIdResolverOpts)`

```ts
interface UpdateByIdResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `record` argument. */
  record?: RecordHelperArgsOpts;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}
```

### `updateMany(opts?: UpdateManyResolverOpts)`

```ts
interface UpdateManyResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `record` argument. */
  record?: RecordHelperArgsOpts;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  limit?: LimitHelperArgsOpts | false;
  skip?: false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}
```

### `updateOne(opts?: UpdateOneResolverOpts)`

```ts
interface UpdateOneResolverOpts {
  /** If you want to generate different resolvers you may avoid Type name collision by adding a suffix to type names */
  suffix?: string;
  /** Customize input-type for `record` argument. */
  record?: RecordHelperArgsOpts;
  /** Customize input-type for `filter` argument. If `false` then arg will be removed. */
  filter?: FilterHelperArgsOpts | false;
  sort?: SortHelperArgsOpts | false;
  skip?: false;
  /** Customize payload.recordId field. If false, then this field will be removed. */
  recordId?: PayloadRecordIdHelperOpts | false;
  /** Customize payload.error field. If true, then this field will be removed. */
  disableErrorField?: boolean;
}
```

### Description of common resolvers' options

#### `FilterHelperArgsOpts`

```ts
type FilterHelperArgsOpts = {
  /**
   * Add to filter arg only that fields which are indexed.
   * If false then all fields will be available for filtering.
   * By default: true
   */
  onlyIndexed?: boolean;
  /**
   * You an remove some fields from type via this option.
   */
  removeFields?: string | string[];
  /**
   * This option makes provided fieldNames as required
   */
  requiredFields?: string | string[];
  /**
   * Customize operators filtering or disable it at all.
   * By default, for performance reason, `graphql-compose-mongoose` generates operators
   * *only for indexed* fields.
   *
   * BUT you may enable operators for all fields when creating resolver in the following way:
   *   // enables all operators for all fields
   *   operators: true,
   * OR provide a more granular `operators` configuration to suit your needs:
   *   operators: {
   *     // for `age` field add just 3 operators
   *     age: ['in', 'gt', 'lt'],
   *     // for non-indexed `amount` field add all operators
   *     amount: true,
   *     // don't add this field to operators
   *     indexedField: false,
   *   }
   *
   * Available logic operators: AND, OR
   * Available field operators: gt, gte, lt, lte, ne, in, nin, regex, exists
   */
  operators?: FieldsOperatorsConfig | false;
  /**
   * Make arg `filter` as required if this option is true.
   */
  isRequired?: boolean;
  /**
   * Base type name for generated filter argument.
   */
  baseTypeName?: string;
  /**
   * Provide custom prefix for Type name
   */
  prefix?: string;
  /**
   * Provide custom suffix for Type name
   */
  suffix?: string;
};
```

#### `SortHelperArgsOpts`

```ts
type SortHelperArgsOpts = {
  /**
   * Allow sort arg to be an array of enum values. Example [AGE_DESC, NAME_ASC, _ID_ASC].
   * Note enum values will only ever be generated for *indexed fields*.
   */
  multi?: boolean;
  /**
   * This option set custom type name for generated sort argument.
   */
  sortTypeName?: string;
};
```

#### `RecordHelperArgsOpts`

```ts
type RecordHelperArgsOpts = {
  /**
   * You an remove some fields from type via this option.
   */
  removeFields?: string[];
  /**
   * This option makes provided fieldNames as required
   */
  requiredFields?: string[];
  /**
   * This option makes all fields nullable by default.
   * May be overridden by `requiredFields` property
   */
  allFieldsNullable?: boolean;
  /**
   * Provide custom prefix for Type name
   */
  prefix?: string;
  /**
   * Provide custom suffix for Type name
   */
  suffix?: string;
  /**
   * Make arg `record` as required if this option is true.
   */
  isRequired?: boolean;
};
```

#### `LimitHelperArgsOpts`

```ts
type LimitHelperArgsOpts = {
  /**
   * Set limit for default number of returned records
   * if it does not provided in query.
   * By default: 100
   */
  defaultValue?: number;
};
```

## FAQ

### Can I get generated vanilla GraphQL types?

```ts
const UserTC = composeMongoose(User);
UserTC.getType(); // returns GraphQLObjectType
UserTC.getInputType(); // returns GraphQLInputObjectType, eg. for args
UserTC.get('languages').getType(); // get GraphQLObjectType for nested field
UserTC.get('fieldWithNesting.subNesting').getType(); // get GraphQL type of deep nested field
```

### How to add custom fields?

```ts
UserTC.addFields({
  lonLat: ObjectTypeComposer.create('type LonLat { lon: Float, lat: Float }'),
  notice: 'String', // shorthand definition
  noticeList: { // extended
    type: '[String]', // String, Int, Float, Boolean, ID, Json
    description: 'Array of notices',
    resolve: (source, args, context, info) => 'some value',
  },
  bio: {
    type: GraphQLString,
    description: 'Providing vanilla GraphQL type'
  }
})
```

### How to build nesting/relations?

Suppose you `User` model has `friendsIds` field with array of user ids. So let build some relations:

```ts
UserTC.addRelation(
  'friends',
  {
    resolver: () => UserTC.mongooseResolvers.dataLoaderMany(),
    prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
      _ids: (source) => source.friendsIds,
    },
    projection: { friendsIds: 1 }, // point fields in source object, which should be fetched from DB
  }
);
UserTC.addRelation(
  'adultFriendsWithSameGender',
  {
    resolver: () => UserTC.mongooseResolvers.findMany(),
    prepareArgs: { // resolver `findMany` has `filter` arg, we may provide mongoose query to it
      filter: (source) => ({
        _operators : { // Applying criteria on fields which have
                       // operators enabled for them (by default, indexed fields only)
          _id : { in: source.friendsIds },
          age: { gt: 21 }
        },
        gender: source.gender,
      }),
      limit: 10,
    },
    projection: { friendsIds: 1, gender: 1 }, // required fields from source object
  }
);
```

### Reusing the same mongoose Schema in embedded object fields

Suppose you have a common structure you use as embedded object in multiple Schemas.
Also suppose you want the structure to have the same GraphQL type across all parent types.
(For instance, to allow reuse of fragments for this type)
Here are Schemas to demonstrate:

```ts
import { Schema } from 'mongoose';

const ImageDataStructure = Schema({
  url: String,
  dimensions : {
    width: Number,
    height: Number
  }
}, { _id: false });

const UserProfile = Schema({
  fullName: String,
  personalImage: ImageDataStructure
});

const Article = Schema({
  title: String,
  heroImage: ImageDataStructure
});
```

If you want the `ImageDataStructure` to use the same GraphQL type in both `Article` and `UserProfile` you will need create it as a mongoose schema (not a standard javascript object) and to explicitly tell `graphql-compose-mongoose` the name you want it to have. Otherwise, without the name, it would generate the name according to the first parent this type was embedded in.

Do the following:

```ts
import { schemaComposer } from 'graphql-compose'; // get the default schemaComposer or your created schemaComposer
import { convertSchemaToGraphQL } from 'graphql-compose-mongoose';

convertSchemaToGraphQL(ImageDataStructure, 'EmbeddedImage', schemaComposer); // Force this type on this mongoose schema
```

Before continuing to convert your models to TypeComposers:

```ts
import mongoose from 'mongoose';
import { composeMongoose } from 'graphql-compose-mongoose';

const UserProfile = mongoose.model('UserProfile', UserProfile);
const Article = mongoose.model('Article', Article);

const UserProfileTC = composeMongoose(UserProfile);
const ArticleTC = composeMongoose(Article);
```

Then, you can use queries like this:

```graphql
query {
  topUser {
    fullName
    personalImage {
      ...fullImageData
    }
  }
  topArticle {
    title
    heroImage {
      ...fullImageData
    }
  }
}
fragment fullImageData on EmbeddedImage {
  url
  dimensions {
    width height
  }
}
```

### Access and modify mongoose doc before save

This library provides some amount of ready resolvers for fetch and update data which was mentioned above. And you can [create your own resolver](https://github.com/graphql-compose/graphql-compose) of course. However you can find that add some actions or light modifications of mongoose document directly before save at existing resolvers appears more simple than create new resolver. Some of resolvers accepts *before save hook* which can be provided in *resolver params* as param named `beforeRecordMutate`. This hook allows to have access and modify mongoose document before save. The resolvers which supports this hook are:

- createOne
- createMany
- removeById
- removeOne
- updateById
- updateOne

The prototype of before save hook:

```ts
(doc: mixed, rp: ResolverResolveParams) => Promise<*>,
```

The typical implementation may be like this:

```ts
// extend resolve params with hook
rp.beforeRecordMutate = async function(doc, rp) {
  doc.userTouchedAt = new Date();

  const canMakeUpdate  = await performAsyncTask( ...provide data from doc... )
  if (!canMakeUpdate) {
    throw new Error('Forbidden!');
  }

  return doc;
}
```

You can provide your implementation directly in type composer:

```ts
UserTC.wrapResolverResolve('updateById', next => async rp => {

  // extend resolve params with hook
  rp.beforeRecordMutate = async (doc, resolveParams) => { ... };

  return next(rp);
});
```

or you can create wrappers for example to protect access:

```ts
function adminAccess(resolvers) {
  Object.keys(resolvers).forEach((k) => {
    resolvers[k] = resolvers[k].wrapResolve(next => async rp => {

      // extend resolve params with hook
      rp.beforeRecordMutate = async function(doc, rp) { ... }

      return next(rp)
    })
  })
  return resolvers
}

// and wrap the resolvers
schemaComposer.Mutation.addFields({
  createResource: ResourceTC.mongooseResolvers.createOne(),
  createResources: ResourceTC.mongooseResolvers.createMany(),
  ...adminAccess({
    updateResource: ResourceTC.mongooseResolvers.updateById(),
    removeResource: ResourceTC.mongooseResolvers.removeById(),
  }),
});
```

### How can I restrict access to certain fields or documents?

This library allows modifying the query before it is executed using the `beforeQuery` hook. This lets us prevent certain fields or documents from being read. Here's an example of restricting access to specific fields:

```ts
schemaComposer.Query.addFields({
  userOne: UserTC.mongooseResolvers.findOne().wrapResolve((next) => (rp) => {
    const { role } = rp.context;

    rp.beforeQuery = (query: Query<unknown, unknown>) => {
      if (role === 'admin') {
        // Don't change the projection and still allow all fields to be read
      } else if (role === 'moderator') {
        // Only allow the name, age, and gender fields to be read
        query.projection({ name: 1, age: 1, gender: 1 });
      } else if (role === 'public') {
        // Only allow the name field to be read
        query.projection({ name: 1 });
      }
    };

    return next(rp);
  }),
});
```

Note that fields that are sometimes restricted should not be marked as required in the mongoose schema. Otherwise, when you query them you will get a "Cannot return null for non-nullable field" error because the database query didn't return a value for the field.

You can also use `beforeQuery` to hide certain documents from the query. Here's an example:

```ts
schemaComposer.Query.addFields({
  postMany: PostTC.mongooseResolvers.findMany().wrapResolve((next) => (rp) => {
    const { userId } = rp.context;

    rp.beforeQuery = (query: Query<unknown, unknown>) => {
      // Only allow users to see their own posts
      query.where('authorId', userId);
    };

    return next(rp);
  }),
});
```

Both of these examples require putting extra data in the resolver context. Here's how to attach context data in Apollo Server:

```ts
const server = new ApolloServer({
  schema: schemaComposer.buildSchema(),
  context() {
    // This role should actually come from a JWT or something
    return { role: 'admin' };
  },
});
```

Other GraphQL servers are likely similar.

### How can I push/pop or add/remove values to arrays?

The default resolvers, by design, will replace (overwrite) any supplied array object when using e.g. `updateById`. If you want to push or pop a value in an array you can use a custom resolver with a native MongoDB call.

For example (push):

```ts
schemaComposer.Mutation.addFields({
  userPushToArray: {
    type: UserTC,
    args: { userId: 'MongoID!', valueToPush: 'String' },
    resolve: async (source, args, context, info) => {
      const user = await User.update(
        { _id: args.userId },
        { $push: { arrayToPushTo: args.valueToPush } }
      );
      if (!user) return null // or gracefully return an error etc...
      return User.findOne({ _id: args.userId }) // return the record
    }
  }
})
```

`User` is the corresponding Mongoose model. If you do not wish to allow duplicates in the array then replace `$push` with `$addToSet`. Read the graphql-compose docs on custom resolvers for more info: https://graphql-compose.github.io/docs/en/basics-resolvers.html

NB if you set `unique: true` on the array then using the `update` `$push` approach will not check for duplicates, this is due to a MongoDB bug: https://jira.mongodb.org/browse/SERVER-1068. For more usage examples with `$push` and arrays see the MongoDB docs here https://docs.mongodb.com/manual/reference/operator/update/push/. Also note that `$push` will preserve order in the array (append to end of array) whereas `$addToSet` will not.

### Is it possible to use several schemas?

By default `composeMongoose` uses global `schemaComposer` for generated types. If you need to create different GraphQL schemas you need create own `schemaComposer`s and provide them to `customizationOptions`:

```ts
import { SchemaComposer } from 'graphql-compose';

const schema1 = new SchemaComposer();
const schema2 = new SchemaComposer();

const UserTCForSchema1 = composeMongoose(User, { schemaComposer: schema1 });
const UserTCForSchema2 = composeMongoose(User, { schemaComposer: schema2 });
```

### Embedded documents has `_id` field and you don't need it?

Just turn them off in mongoose:

```ts
const UsersSchema = new Schema({
  _id: { type: String }
  emails: [{
    _id: false, // <-- disable id addition in mongoose
    address: { type: String },
    verified: Boolean
  }]
});
```

### Can field name in schema have different name in database?

Yes, it can. This package understands mongoose [`alias` option](https://mongoosejs.com/docs/guide.html#aliases) for fields. Just provide `alias: 'country'` for field `c` and you get `country` field name in GraphQL schema and Mongoose model but `c` field in database:

```ts
const childSchema = new Schema({
  c: {
    type: String,
    alias: 'country'
  }
});
```

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/graphql-compose#backer)]

<a href="https://opencollective.com/graphql-compose#backers" target="_blank"><img src="https://opencollective.com/graphql-compose/backers.svg?width=890"></a>

## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/graphql-compose#sponsor)]

<a href="https://opencollective.com/graphql-compose/sponsor/0/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/1/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/2/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/3/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/4/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/5/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/6/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/7/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/8/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/9/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/9/avatar.svg"></a>

## License

[MIT](https://github.com/graphql-compose/graphql-compose-mongoose/blob/master/LICENSE.md)
