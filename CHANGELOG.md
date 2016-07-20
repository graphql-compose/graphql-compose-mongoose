## master

## 1.0.4 (July 20, 2016)
* expose `fieldsConverter` methods
* fix filterHelper: if `filter` InputType without fields, then do not add it to args
* fix projectionHelper: make projection flat, before passing to mongoose
* add `convertSchemaToGraphQL` method for creating cached graphql type from MongooseSchema

## 1.0.3 (July 18, 2016)
* HotFix for connection resolver
* HotFix for operators' types in `filter` helper

## 1.0.1 (July 18, 2016)
* Fix `peerDependencies`
* Update `flow` till 0.29
* Other small fixes

## 1.0.0 (July 15, 2016)
* add connection resolver
* add support for filtering with operators $gt, $gte, $lt, $lte, $ne, $in, $nin
* small fixes

## 0.0.6 (July 08, 2016)
* rename `input` argument to `record` for mutations (due `graphql-compose-relay` compatibility).
`input` is a reserved name for mutations' arg in Relay, and may contains not only document/record data (eg. clientMutationId, sort and filter args). So better solution for `graphql-compose-mongoose` do not use this name, cause `graphql-compose-relay` get all args from mongoose resolvers and put them to `input` arg.

## 0.0.5 (July 07, 2016)
* refactor Resolvers due changes in graphql-compose api
* exports flow annotations

## 0.0.3 (July 01, 2016)
* First beta version

## 0.0.1 (June 07, 2016)
* Initial commit
