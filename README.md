graphql-compose-mongoose
======================
This is a plugin for [graphql-compose](https://github.com/nodkz/graphql-compose), which derives a graphql type from mongoose model.

TODO
====
- [x] convert mongoose models to GraphQLObjectTypes (supports: all primitive types, enums, embedded documents, document arrays, embedded schemas, deep arrays of any type).
- [ ] write resolve methods (findById, findByIds, findOne, findMany, updateOne, updateMany, removeOne, removeMany, count)
- [ ] realize helper methods for Type construction from [apiProposal]( https://github.com/nodkz/graphql-compose-mongoose/blob/master/src/metaApiProposal.js)
- [ ] in queries add support for $lt, $gt and other selector's operators
- [ ] add support GraphQL Connection Type

Contribute
==========
I actively welcome pull requests with code and doc fixes. 
Also if you made great middleware and want share it within this module, please feel free to open PR.

[CHANGELOG](https://github.com/nodkz/graphql-compose-mongoose/blob/master/CHANGELOG.md)

License
=======
[MIT](https://github.com/nodkz/graphql-compose-mongoose/blob/master/LICENSE.md)
