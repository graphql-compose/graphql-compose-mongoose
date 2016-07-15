## master

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
