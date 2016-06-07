
import { Schema } from 'mongoose';
const UserMongooseModel = new Schema({
  myName: String,
  surname: String,
  stats: String,
  password: String,
  dob: String,
});


import { only, rename, remove, restrict, add } from 'graphql-compose/fields';
import { composeTypeFromMongoose } from 'graphql-compose-mongoose';
import { GraphQLString } from 'graphql';

let UserType = composeTypeFromMongoose(UserMongooseModel)
  .name('User')
  .description('User model description')
  .only(['myName', 'surname'])
  .rename({
    myName: 'name',
    surname: 'lastname',
  })
  .remove(['stats', 'password'])
  .restrict({
    hasAccess: (source, args, context, info) => {
      return context.isAdmin;
    },
    fields: ['name', 'dob'],
  })
  .add({
    time: {
      type: GraphQLString,
      resolve: (source, args, context, info) => {
        return JSON.stringify(Date.now());
      },
    },
    friends: () => listOf(getComposeType('User')),
  });

// somewere else in code extend `User` type 
getComposeType('User')
  .changeValue({
    name: (source, args, context, info) => `${source.name} modified`,
  })
  .resolveById({
    resolve: () => { }
  })
  .resolveList({
    args: { ids, limit, skip, filter, sort },
    resolve: () => {},
  })
  .resolveConnection({
    args: { after, first, before, last, filter, sort},
    resolve: () => {},
  })
  .resolveById( // another way
    new DataLoader(keys => myBatchGetUsers(keys))
  );
